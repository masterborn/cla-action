import * as core from "@actions/core"
import { context } from "@actions/github"
import { getCLAs } from "./checkcla"
import { lockPullRequest } from "./pullRequestLock"

export async function run() {
  try {
    const pullRequestNo: number = context.issue.number
    core.info(`CLA Assistant GitHub Action has started`)

    if (context.payload.action === 'closed') {
      return lockPullRequest(pullRequestNo)
    } else {
      await getCLAs(pullRequestNo)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}
run()
