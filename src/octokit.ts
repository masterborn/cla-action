import { GitHub } from '@actions/github'
import * as core from '@actions/core'


const octokit = new GitHub(process.env.GITHUB_TOKEN as string)

const persistanceRepository = core.getInput('persistance-repository')
const persistanceOctokit = persistanceRepository !== '' && process.env.PERSISTANCE_GITHUB_TOKEN ? new GitHub(process.env.PERSISTANCE_GITHUB_TOKEN as string) : octokit

export default octokit 
export { octokit, persistanceOctokit }
