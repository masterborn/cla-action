import { context } from "@actions/github"
import { octokit, persistanceOctokit } from './inits/octokit'
import isForkedPRRun from './common/isForkedPRRun'

export default async function rerunFailedWorkflow() {
  if (!isForkedPRRun()) return;

  const result = await octokit.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.issue.number
  })
  const result2 = await octokit.actions.listWorkflowRunsForRepo({
    owner: context.repo.owner,
    repo: context.repo.repo,
    branch: result.data.head.ref
  })
  const result3 = await octokit.actions.reRunWorkflow({
    owner: context.repo.owner,
    repo: context.repo.repo,
    run_id: result2.data.workflow_runs[0].id
  })
}
