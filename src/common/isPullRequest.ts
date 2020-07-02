import { context } from '@actions/github'

export default function isIssue(): boolean {
  return context.eventName === 'pull_request' || !!context.payload?.issue?.pull_request!
}
