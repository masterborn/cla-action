import octokit from './inits/octokit'
import * as core from '@actions/core'
import { context } from '@actions/github'
import { isForkedPRRun } from './common'

export async function lockPullRequest(pullRequestNo: number) {
    if (isForkedPRRun()) return;
    core.info('Locking the Pull Request to safe guard the Pull Request CLA Signatures')
    try {
        await octokit.issues.lock(
            {
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: pullRequestNo
            }
        )
        core.info(`successfully locked the pull request ${pullRequestNo}`)
    } catch (e) {
        core.error(`failed when locking the pull request `)
    }
}
