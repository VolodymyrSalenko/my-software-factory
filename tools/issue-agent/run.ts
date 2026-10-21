import { fileURLToPath } from 'node:url'
import { mastra } from './src/mastra/index.ts'

// Local default: the Claude Code binary bundled with the VS Code extension (not on PATH here). CI sets CLAUDE_BIN or installs `claude`.
process.env.CLAUDE_BIN ??= `${process.env.USERPROFILE}/.vscode/extensions/anthropic.claude-code-2.1.301-win32-x64/resources/native-binary/claude.exe`

const workflow =mastra.getWorkflow('issueToPr')
const run = await workflow.createRun()
const result = await run.start({
  inputData: {
    repo: process.env.REPO ?? 'VolodymyrSalenko/my-software-factory',
    // Path to a local clone (default: the repo that contains this tool). The workflow adds a separate git worktree, so this checkout is not modified.
    repoPath: process.env.REPO_PATH ?? fileURLToPath(new URL('../..', import.meta.url)),
    baseBranch: process.env.BASE_BRANCH ?? 'main',
    issueNumber: Number(process.env.ISSUE ?? 2),
  },
})

console.log('status:', result.status)
if (result.status === 'success') console.log('result:', result.result)
else console.log(result)
