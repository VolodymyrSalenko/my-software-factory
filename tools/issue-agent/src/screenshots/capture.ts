import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, mkdirSync, mkdtempSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const run = promisify(execFile)

// Files that can change what the page looks like. Anything under tools/ is the agent itself, not the site.
const VISUAL = /\.(html?|css|js|svg)$/i
export const isVisualChange = (changedPaths: string[]) =>
  changedPaths.some((p) => VISUAL.test(p) && !p.startsWith('tools/'))

function findChrome(): string {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ]
  return candidates.find((c) => existsSync(c)) ?? 'google-chrome'
}

async function shoot(siteDir: string, out: string, chrome: string) {
  // A tall window makes every scroll-reveal section visible, so the whole page is captured.
  await run(chrome, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    '--virtual-time-budget=4000', '--window-size=1280,4200',
    `--screenshot=${out}`, pathToFileURL(join(siteDir, 'index.html')).href,
  ], { timeout: 60_000 })
  if (!existsSync(out)) throw new Error(`Chrome produced no screenshot at ${out}`)
}

// Takes "before" (the base commit, via git archive) and "after" (the edited worktree) screenshots of index.html.
// Returns repo-relative paths of the images, which are written inside the worktree so the PR step commits them.
export async function captureBeforeAfter(workdir: string, issueNumber: number): Promise<string[]> {
  const { stdout } = await run('git', ['status', '--porcelain'], { cwd: workdir })
  const changed = stdout.split('\n').filter(Boolean).map((l) => l.slice(3).trim())
  if (!isVisualChange(changed)) return []
  if (!existsSync(join(workdir, 'index.html'))) return []

  // "Before" = a clean checkout of the base commit (HEAD of the worktree; the agent's edits are uncommitted).
  const tmp = realpathSync.native(mkdtempSync(join(tmpdir(), 'issue-agent-before-')))
  const beforeDir = join(tmp, 'site')
  await run('git', ['worktree', 'add', '--detach', beforeDir, 'HEAD'], { cwd: workdir })

  const rel = `.pr-assets/issue-${issueNumber}`
  mkdirSync(join(workdir, rel), { recursive: true })
  const chrome = findChrome()
  try {
    await shoot(beforeDir, join(workdir, rel, 'before.png'), chrome)
    await shoot(workdir, join(workdir, rel, 'after.png'), chrome)
  } finally {
    await run('git', ['worktree', 'remove', '--force', beforeDir], { cwd: workdir }).catch(() => {})
  }
  return [`${rel}/before.png`, `${rel}/after.png`]
}
