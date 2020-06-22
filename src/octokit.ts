import { GitHub } from '@actions/github'
import Octokit from '@octokit/rest'
import * as core from '@actions/core'


const octokit = new GitHub(process.env.GITHUB_TOKEN as string)

const persistanceRepository = core.getInput('persistance-repository')
const persistanceOctokit = persistanceRepository !== '' && process.env.PERSISTANCE_GITHUB_TOKEN ? new GitHub(process.env.PERSISTANCE_GITHUB_TOKEN as string) : new Octokit()

export default octokit 
export { octokit, persistanceOctokit }
