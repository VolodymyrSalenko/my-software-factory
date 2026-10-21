import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildPrompt, runClaudeCode } from '../../agents/claude-code.ts'
import { commitPushAndOpenPr } from '../../github/open-pr.ts'

const run = promisify(execFile)

const git = (cwd: string, ...args: string[]) => run('git', args, { cwd })

// Shape that flows through the early steps.
const issueShape = {
  repo: z.string(),
  repoPath: z.string(),
  baseBranch: z.string(),
  issueNumber: z.number(),
  title: z.string(),
  body: z.string(),
}

// Step 1: fetch the issue from GitHub with the gh CLI (needs gh logged in, or GH_TOKEN in CI).
const fetchIssue = createStep({
  id: 'fetch-issue',
  inputSchema: z.object({
    repo: z.string(),
    repoPath: z.string(),
    baseBranch: z.string(),
    issueNumber: z.number(),
  }),
  outputSchema: z.object(issueShape),
  execute: async ({ inputData }) => {
    const { repo, issueNumber } = inputData
    const { stdout } = await run('gh', [
      'issue', 'view', String(issueNumber), '--repo', repo, '--json', 'title,body,comments,state',
    ])
    const issue = JSON.parse(stdout) as { title: string; body: string; state: string; comments: { body: string }[] }
    if (issue.state !== 'OPEN') throw new Error(`Issue #${issueNumber} is ${issue.state}, not OPEN`)
    // Comments can hold clarifications, so they go to the agent as part of the task.
    const comments = issue.comments.map((c) => c.body).join('\n\n---\n\n')
    const body = comments ? `${issue.body}\n\n## Comments\n\n${comments}` : issue.body
    console.log(`[fetch-issue] ${repo}#${issueNumber}: ${issue.title} (${body.length} chars)`)
    return { ...inputData, title: issue.title, body }
  },
})

// Step 2: create an isolated git worktree on a new issue branch.
// The user's own checkout (current branch, uncommitted files) is never touched.
const createBranch = createStep({
  id: 'create-branch',
  inputSchema: z.object(issueShape),
  outputSchema: z.object({ ...issueShape, branch: z.string(), workdir: z.string() }),
  execute: async ({ inputData }) => {
    const { repoPath, baseBranch, issueNumber, title } = inputData
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
    const branch = `issue-${issueNumber}-${slug}`
    // realpathSync.native expands Windows 8.3 short names (VOLODY~1); Claude Code blocks writes under those.
    const workdir = join(realpathSync.native(tmpdir()), 'issue-agent', `${repoPath.replace(/[\\/]+$/, '').split(/[\\/]/).pop()}-issue-${issueNumber}`)

    if (existsSync(workdir)) throw new Error(`Worktree already exists: ${workdir}. Remove it first (git worktree remove).`)

    await git(repoPath, 'fetch', 'origin', baseBranch)
    // `git worktree add -b` fails if the branch already exists, so a rerun never overwrites earlier work.
    await git(repoPath, 'worktree', 'add', '-b', branch, workdir, `origin/${baseBranch}`)
    console.log(`[create-branch] ${branch} from origin/${baseBranch} in ${workdir}`)
    return { ...inputData, branch, workdir }
  },
})

// What steps 3-5 carry along.
const workShape = {
  repo: z.string(),
  baseBranch: z.string(),
  issueNumber: z.number(),
  title: z.string(),
  branch: z.string(),
  workdir: z.string(),
  summary: z.string(),
}

// Step 3: run the coding agent (Claude Code) inside the worktree.
const runCodingAgent = createStep({
  id: 'run-coding-agent',
  inputSchema: z.object({ ...issueShape, branch: z.string(), workdir: z.string() }),
  outputSchema: z.object(workShape),
  execute: async ({ inputData }) => {
    const { workdir, issueNumber, title, body, branch, repo, baseBranch } = inputData
    console.log(`[run-coding-agent] Claude Code is working on "${title}" in ${workdir}`)
    const result = await runClaudeCode({ workdir, prompt: buildPrompt({ number: issueNumber, title, body }) })
    const { stdout } = await git(workdir, 'status', '--porcelain')
    if (!stdout.trim()) throw new Error('Claude Code finished but changed no files, so there is nothing to open a PR for.')
    const files = stdout.trim().split('\n').length
    console.log(`[run-coding-agent] done: ${files} file(s) changed${result.costUsd != null ? `, cost $${result.costUsd.toFixed(2)}` : ''}`)
    return { repo, baseBranch, issueNumber, title, branch, workdir, summary: result.summary }
  },
})

// Step 4: screenshots of visual changes. Stub for now. Later it writes images into the worktree
// (e.g. .pr-assets/) and returns their repo-relative paths so step 5 commits and embeds them.
const takeScreenshots = createStep({
  id: 'take-screenshots',
  inputSchema: z.object(workShape),
  outputSchema: z.object({ ...workShape, screenshots: z.array(z.string()) }),
  execute: async ({ inputData }) => {
    console.log('[take-screenshots] none yet')
    return { ...inputData, screenshots: [] }
  },
})

// Step 5: commit, push and open the pull request. DRY_RUN=1 commits locally but pushes nothing.
const openPullRequest = createStep({
  id: 'open-pull-request',
  inputSchema: z.object({ ...workShape, screenshots: z.array(z.string()) }),
  outputSchema: z.object({ prUrl: z.string(), branch: z.string(), workdir: z.string() }),
  execute: async ({ inputData }) => {
    const dryRun = process.env.DRY_RUN === '1'
    const { prUrl } = await commitPushAndOpenPr({ ...inputData, dryRun })
    console.log(`[open-pull-request] ${prUrl}`)
    return { prUrl, branch: inputData.branch, workdir: inputData.workdir }
  },
})

export const issueToPr = createWorkflow({
  id: 'issue-to-pr',
  inputSchema: z.object({
    repo: z.string(),
    repoPath: z.string(),
    baseBranch: z.string(),
    issueNumber: z.number(),
  }),
  outputSchema: z.object({ prUrl: z.string(), branch: z.string(), workdir: z.string() }),
})
  .then(fetchIssue)
  .then(createBranch)
  .then(runCodingAgent)
  .then(takeScreenshots)
  .then(openPullRequest)
  .commit()
