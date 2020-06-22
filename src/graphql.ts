import octokit from './octokit'
import * as core from '@actions/core';
import { context } from '@actions/github'
import { CommittersDetails } from './interfaces'


const queryPullRequests = async (): Promise<any> => {
    const response = await octokit.graphql(`
        query($owner:String! $name:String! $number:Int! $cursor:String!){
            repository(owner: $owner, name: $name) {
            pullRequest(number: $number) {
                commits(first: 100, after: $cursor) {
                    totalCount
                    edges {
                        node {
                            commit {
                                author {
                                    email
                                    name
                                    user {
                                        id
                                        databaseId
                                        login
                                    }
                                }
                                committer {
                                    name
                                    user {
                                        id
                                        databaseId
                                        login
                                    }
                                }
                            }
                        }
                        cursor
                    }
                    pageInfo {
                        endCursor
                        hasNextPage
                    }
                }
            }
        }
    }`.replace(/ /g, ''), {
        owner: context.repo.owner,
        name: context.repo.repo,
        number: context.issue.number,
        cursor: ''
    });
    return response;
}

const queryIssues = async (): Promise<any> => {
    const response = await octokit.graphql(`
        query($owner:String! $name:String! $number:Int! $cursor:String!){
            repository(owner: $owner, name: $name) {
            issue(number: $number) {
                participants(first: 100, after: $cursor) {
                    totalCount
                    edges {
                        node {
                            email
                            name
                            id
                            databaseId
                            login
                        }
                        cursor
                    }
                    pageInfo {
                        endCursor
                        hasNextPage
                    }
                }
            }
        }
    }`.replace(/ /g, ''), {
        owner: context.repo.owner,
        name: context.repo.repo,
        number: context.issue.number,
        cursor: ''
    });
    return response;
}


export default async function getCommitters() {
    try {
        let committers: CommittersDetails[] = []
        let filteredCommitters: CommittersDetails[] = []
        let response: any
        console.log(JSON.stringify(context))
        switch (context.eventName) {
            case 'pull_request':
                response = await queryPullRequests()
                response.repository.pullRequest.commits.edges.forEach(edge => {
                    let committer = extractUserFromCommit(edge.node.commit)
                    let user = {
                        name: committer.login || committer.name,
                        id: committer.databaseId || '',
                        pullRequestNo: context.issue.number
                    }
                    if (committers.length === 0 || committers.map((c) => {
                        return c.name
                    }).indexOf(user.name) < 0) {
                        committers.push(user)
                    }
                })
                break
            case 'issue_comment':
                response = await queryIssues()
                response.repository.issue.participants.edges.forEach(edge => {
                    const committer = edge.node
                    let user = {
                        name: committer.login || committer.name,
                        id: committer.databaseId || '',
                        pullRequestNo: context.issue.number
                    }
                    if (committers.length === 0 || committers.map((c) => {
                        return c.name
                    }).indexOf(user.name) < 0) {
                        committers.push(user)
                    }
                })
                break
            default:
                throw new Error(`Event ${context.eventName} not supported`)
        }
        filteredCommitters = committers.filter((committer) => {
            return committer.id !== 41898282
        })
        return filteredCommitters

    } catch (e) {
        core.setFailed('graphql call to get the committers details failed:' + e)
    }

}
const extractUserFromCommit = (commit) => commit.author.user || commit.committer.user || commit.author || commit.committer
