import * as core from '@actions/core'
import { context } from '@actions/github'
import { persistanceOctokit } from './inits/octokit'
import { isForkedPRRun, isPullRequest }  from './common'
import { ActionsListWorkflowRunsForRepoResponseData } from '@octokit/types'

const getLatestCLAWorkflowRun = async (workflowRuns: ActionsListWorkflowRunsForRepoResponseData) => {
  for (const workflowRun of workflowRuns.workflow_runs) {
    const { data: workflow } = await persistanceOctokit.actions.getWorkflow({
      owner: context.repo.owner,
      repo: context.repo.repo,
      workflow_id: workflowRun.workflow_id
    })
    if (workflow.name === context.workflow) return workflowRun;
  }
}

export default async function rerunFailedWorkflow() {
  if (isForkedPRRun() || !isPullRequest()) return;
  
  try {
    const { data: pullRequest } = await persistanceOctokit.pulls.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: context.issue.number
    })

    const { data: workflowRuns } = await persistanceOctokit.actions.listWorkflowRunsForRepo({
      owner: context.repo.owner,
      repo: context.repo.repo,
      branch: pullRequest.head.ref
    })

    const workflowRun = await getLatestCLAWorkflowRun(workflowRuns);
    
    if (workflowRun && workflowRun.conclusion !== 'success') {
      await persistanceOctokit.actions.reRunWorkflow({
        owner: context.repo.owner,
        repo: context.repo.repo,
        run_id: workflowRun.id
      })
    }
  } catch (e) {
    core.setFailed('Could not rerun workflow:' + e)
  }
}
