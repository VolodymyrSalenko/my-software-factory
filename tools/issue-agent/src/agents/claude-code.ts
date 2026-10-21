import { spawn } from 'node:child_process'

export type CodingAgentResult = { summary: string; costUsd?: number }

// Tools the agent may use without asking. No git commit/push: the workflow does those itself.
const ALLOWED_TOOLS = ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash(git diff:*)', 'Bash(git status:*)', 'Bash(node:*)']

export function buildPrompt(issue: { number: number; title: string; body: string }) {
  return [
    `Implement GitHub issue #${issue.number} in the current repository.`,
    '',
    `# ${issue.title}`,
    '',
    issue.body,
    '',
    '## Rules',
    '- Make the smallest change that satisfies the acceptance criteria.',
    '- Follow the existing code style. Read the relevant files before editing.',
    '- Do not commit, push, or create branches. The caller does that.',
    '- When finished, reply with a short plain-text summary of what you changed and why (3-6 lines, no preamble).',
  ].join('\n')
}

// Runs Claude Code headless (subscription login or ANTHROPIC_API_KEY, whichever the CLI is set up with).
export function runClaudeCode(opts: {
  workdir: string
  prompt: string
  bin?: string
  maxBudgetUsd?: number
  timeoutMs?: number
}): Promise<CodingAgentResult> {
  const bin = opts.bin ?? process.env.CLAUDE_BIN ?? 'claude'
  const args = [
    '-p',
    '--output-format', 'json',
    '--permission-mode', 'acceptEdits',
    '--allowedTools', ...ALLOWED_TOOLS,
    '--max-budget-usd', String(opts.maxBudgetUsd ?? 5),
    '--no-session-persistence',
  ]
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { cwd: opts.workdir, stdio: ['pipe', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error(`Claude Code timed out after ${(opts.timeoutMs ?? 900_000) / 1000}s`))
    }, opts.timeoutMs ?? 900_000)
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (err += d))
    child.on('error', (e) => { clearTimeout(timer); reject(new Error(`Could not start "${bin}": ${e.message}. Set CLAUDE_BIN.`)) })
    child.on('close', (code) => {
      clearTimeout(timer)
      try {
        const res = JSON.parse(out) as { result?: string; is_error?: boolean; total_cost_usd?: number }
        if (res.is_error || code !== 0) return reject(new Error(`Claude Code failed (exit ${code}): ${res.result ?? err}`))
        resolve({ summary: (res.result ?? '').trim(), costUsd: res.total_cost_usd })
      } catch {
        reject(new Error(`Claude Code gave unreadable output (exit ${code}): ${(out || err).slice(0, 500)}`))
      }
    })
    child.stdin.end(opts.prompt) // prompt via stdin avoids shell quoting and argument-length limits
  })
}
