import { getOctokit } from '@actions/github'
import * as core from '@actions/core'
import isForkedPRRun from '../common/isForkedPRRun'

const octokit = getOctokit(process.env.GITHUB_TOKEN as string)

const readOctokit = getOctokit('')

const persistanceRepository = core.getInput('persistance-repository')
const persistanceOctokit = isForkedPRRun() ? readOctokit : getOctokit(process.env.PERSISTANCE_GITHUB_TOKEN as string)


export default octokit 
export { octokit, persistanceOctokit, readOctokit }
