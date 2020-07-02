import getCommitters from "./graphql"
import { readOctokit, persistanceOctokit } from "./inits/octokit"
import * as core from "@actions/core"
import { context } from "@actions/github"
import prComment from "./pullRequestComment"
import { CommitterMap, CommittersDetails, ReactedCommitterMap } from "./interfaces"
import { checkWhitelist } from "./checkWhiteList"
import rerunFailedWorkflow from './rerunFailedWorkflow'
const _ = require('lodash')

const getPersistanceRepository = (): string => {
  return core.getInput('persistance-repository') || context.repo.repo
}

function prepareCommiterMap(committers: CommittersDetails[], clas): CommitterMap {

  let committerMap: CommitterMap = {}

  committerMap.notSigned = committers.filter(
    committer => !clas.signedContributors.some(cla => committer.id === cla.id)
  )
  committerMap.signed = committers.filter(committer =>
    clas.signedContributors.some(cla => committer.id === cla.id)
  )
  committers.map(committer => {
    if (!committer.id) {
      committerMap.unknown!.push(committer)
    }
  })
  return committerMap
}
//TODO: refactor the commit message when a project admin does recheck PR
async function updateFile(pathToClaSignatures, sha, contentBinary, branch, pullRequestNo) {
  await persistanceOctokit.repos.createOrUpdateFileContents({
    owner: context.repo.owner,
    repo: getPersistanceRepository(),
    path: pathToClaSignatures,
    sha: sha,
    message: `@${context.actor} has signed the CLA from Pull Request ${pullRequestNo}`,
    content: contentBinary,
    branch: branch
  })
}

function createFile(pathToClaSignatures, contentBinary, branch): Promise<object> {
  /* TODO: add dynamic message content  */
  return persistanceOctokit.repos.createOrUpdateFileContents({
    owner: context.repo.owner,
    repo: getPersistanceRepository(),
    path: pathToClaSignatures,
    message:
      "Creating file for storing CLA Signatures",
    content: contentBinary,
    branch: branch
  })
}

export async function getCLAs(pullRequestNo: number) {
  let committerMap = {} as CommitterMap

  let signed: boolean = false
  //getting the path of the cla from the user
  let pathToClaSignatures: string = core.getInput("path-to-signatures")
  let branch: string = core.getInput("branch")
  if (!pathToClaSignatures || pathToClaSignatures == "") {
    pathToClaSignatures = "signatures/cla.json" // default path for storing the signatures
  }
  if (!branch || branch == "") {
    branch = "master"
  }
  let result, clas, sha
  let committers = (await getCommitters()) as CommittersDetails[]
  //TODO code in more readable and efficient way
  committers = checkWhitelist(committers)
  try {
    result = await readOctokit.repos.getContents({
      owner: context.repo.owner,
      repo: getPersistanceRepository(),
      path: pathToClaSignatures,
      ref: branch
    })
    sha = result.data.sha
  } catch (error) {
    core.debug(`Error message: ${error}`)
    if (error.status === 404) {
      committerMap.notSigned = committers
      committerMap.signed = []
      committers.map(committer => {
        if (!committer.id) {
          committerMap.unknown!.push(committer)
        }
      })

      const initialContent = { signedContributors: [] }
      const initialContentString = JSON.stringify(initialContent, null, 2)
      const initialContentBinary = Buffer.from(initialContentString).toString("base64")

      Promise.all([
        createFile(pathToClaSignatures, initialContentBinary, branch),
        prComment(signed, committerMap, committers, pullRequestNo),
      ])
        .then(() => core.setFailed(`Committers of pull request ${context.issue.number} have to sign the CLA`))
        .catch(error => core.setFailed(
          `Error occurred when creating the signed contributors file: ${error.message || error}. Make sure the branch where signatures are stored is NOT protected.`
        ))
    } else {
      core.setFailed(`Could not retrieve repository contents: ${error.message}. Status: ${error.status || 'unknown'}`);
    }
    return
  }
  clas = Buffer.from(result.data.content, "base64").toString()
  clas = JSON.parse(clas)
  committerMap = prepareCommiterMap(committers, clas) as CommitterMap
  core.debug("unsigned contributors are: " + JSON.stringify(committerMap.notSigned, null, 2))
  core.debug("signed contributors are: " + JSON.stringify(committerMap.signed, null, 2))
  //DO NULL CHECK FOR below
  if (committerMap && committerMap.notSigned && committerMap.notSigned.length === 0) {
    core.debug("null check")
    signed = true
  }

  await rerunFailedWorkflow()

  try {
    const reactedCommitters: ReactedCommitterMap = (await prComment(signed, committerMap, committers, pullRequestNo)) as ReactedCommitterMap
    if (signed) {
      core.info("All committers have signed the CLA")
      return
    }
    if (reactedCommitters) {
      if (reactedCommitters.newSigned) {
        clas.signedContributors.push(...reactedCommitters.newSigned)
        let contentString = JSON.stringify(clas, null, 2)
        let contentBinary = Buffer.from(contentString).toString("base64")
        /* pushing the recently signed  contributors to the CLA Json File */
        await updateFile(pathToClaSignatures, sha, contentBinary, branch, pullRequestNo)
      }
      if (reactedCommitters.allSignedFlag) {
        core.info("All committers have signed the CLA")
        return
      }
    }

    /* return when there are no unsigned committers */
    if (committerMap.notSigned === undefined || committerMap.notSigned.length === 0) {
      core.info("All committers have signed the CLA")
      return
    }

    core.setFailed(`committers of Pull Request number ${context.issue.number} have to sign the CLA`)
  } catch (err) {
    core.setFailed(`Could not update the JSON file: ${err.message}`)
    throw new Error("error while updating the JSON file" + err)
  }
  return clas
}
