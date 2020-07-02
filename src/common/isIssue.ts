
import { context } from '@actions/github'

export default function isIssue(): boolean {
  return context.eventName === 'issue_comment' || context.eventName === 'issues'
}
