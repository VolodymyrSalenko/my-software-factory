import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const git = (cwd: string, ...args: string[]) => run('git', args, { cwd })

export type PrInput = {
  repo: string // owner/name
  workdir: string
  branch: string
  baseBranch: string
  issueNumber: number
  title: string
  summary: string
  screenshots: string[] // repo-relative paths, already written into workdir
  dryRun?: boolean
}

export function buildPrBody(i: Pick<PrInput, 'repo' | 'branch' | 'issueNumber' | 'summary' | 'screenshots'>) {
  const parts = ['## Summary', '', i.summary || '(the agent gave no summary)']
  if (i.screenshots.length) {
    parts.push('', '## Screenshots', '')
    for (const path of i.screenshots) {
      // Images are committed on the PR branch, so link to them there.
      const alt = (path.split('/').pop() ?? path).replace(/\.[^.]+$/, '')
      parts.push(`![${alt}](https://github.com/${i.repo}/blob/${i.branch}/${path}?raw=true)`)
    }
  }
  parts.push('', `Closes #${i.issueNumber}`, '', '🤖 Generated with [Claude Code](https://claude.com/claude-code)')
  return parts.join('\n')
}

// Commits everything the agent changed, pushes the branch and opens the PR. Returns the PR URL
// (or a placeholder in dry-run mode, where nothing is pushed).
export async function commitPushAndOpenPr(i: PrInput): Promise<{ prUrl: string; body: string }> {
  const body = buildPrBody(i)
  await git(i.workdir, 'add', '-A')
  const message = `Implement #${i.issueNumber}: ${i.title}\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`
  await git(i.workdir, 'commit', '-m', message)

  if (i.dryRun) return { prUrl: '(dry run: nothing pushed)', body }

  await git(i.workdir, 'push', '-u', 'origin', i.branch)
  const { stdout } = await run(
    'gh',
    ['pr', 'create', '--repo', i.repo, '--base', i.baseBranch, '--head', i.branch, '--title', i.title, '--body', body],
    { cwd: i.workdir },
  )
  return { prUrl: stdout.trim().split('\n').pop() ?? stdout.trim(), body }
}
