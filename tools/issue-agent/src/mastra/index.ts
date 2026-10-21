import { Mastra } from '@mastra/core'
import { issueToPr } from './workflows/issue-to-pr.ts'

export const mastra = new Mastra({
  workflows: { issueToPr },
})
