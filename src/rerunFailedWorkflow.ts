import * as core from '@actions/core'
import { context } from '@actions/github'
import { persistanceOctokit } from './inits/octokit'
import { isForkedPRRun, isPullRequest }  from './common'

export default async function rerunFailedWorkflow() {
  if (isForkedPRRun() || !isPullRequest()) return;

  try {
    const { data: pullRequest } = await persistanceOctokit.pulls.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: context.issue.number
    })

    const { data: workflows } = await persistanceOctokit.actions.listWorkflowRunsForRepo({
      owner: context.repo.owner,
      repo: context.repo.repo,
      branch: pullRequest.head.ref
    })

    core.debug('Workflow :' + JSON.stringify(workflows))
    if (workflows.workflow_runs.length !== 0 && workflows.workflow_runs[0].conclusion !== 'success') {
      await persistanceOctokit.actions.reRunWorkflow({
        owner: context.repo.owner,
        repo: context.repo.repo,
        run_id: workflows.workflow_runs[0].id
      })
    }
  } catch (e) {
    core.setFailed('Could not rerun workflow:' + e)
  }
}
