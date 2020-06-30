import { getOctokit } from '@actions/github'
import { Octokit } from '@octokit/rest'
import * as core from '@actions/core'
import isForkedPRRun from '../common/isForkedPRRun'

const octokit = getOctokit(process.env.GITHUB_TOKEN as string)

const readOctokit = new Octokit();

const persistanceRepository = core.getInput('persistance-repository')
const persistanceOctokit = isForkedPRRun() ? readOctokit : getOctokit(process.env.PERSISTANCE_GITHUB_TOKEN as string)


export default octokit 
export { octokit, persistanceOctokit, readOctokit }
