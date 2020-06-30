import octokit from './inits/octokit'
import * as core from '@actions/core';
import { context } from '@actions/github'
import { CommittersDetails } from './interfaces'

const extractUserFromCommit = (commit: any) => commit.author.user || commit.committer.user || commit.author || commit.committer

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


const isPullRequest = (): boolean => context.eventName === 'pull_request' || !!context.payload?.issue?.pull_request!
const isIssue = (): boolean => context.eventName === 'issue_comment'

const createCommitter = (committer: any): CommittersDetails => {
    return {
        name: committer.login || committer.name,
        id: committer.databaseId || '',
        pullRequestNo: context.issue.number
    }
}

const isCommitterOnTheList = (committers: CommittersDetails[], committer: CommittersDetails) => {
    return committers.length === 0 || committers.map((c) => {
        return c.name
    }).indexOf(committer.name) < 0
}

const handlePullRequests = async (): Promise<CommittersDetails[]> => {
    const committers: CommittersDetails[] = []
    const response = await queryPullRequests()
    response.repository.pullRequest.commits.edges
        .forEach((edge: any) => {
            const committer: CommittersDetails = createCommitter(
                extractUserFromCommit(edge.node.commit)
            );
            if (isCommitterOnTheList(committers, committer)) {
                committers.push(committer)
            }
        })
    return committers;
}

const handleIssues = async (): Promise<CommittersDetails[]> => {
    const committers: CommittersDetails[] = []
    const response = await queryIssues()
    response.repository.issue.participants.edges
        .forEach((edge: any) => {
            const committer: CommittersDetails = createCommitter(edge.node);
            if (isCommitterOnTheList(committers, committer)) {
                committers.push(committer)
            }
        })
    return committers;
}

export default async function getCommitters() {
    try {
        let committers: CommittersDetails[] = []
        switch (true) {
            case (isPullRequest()):
                committers = await handlePullRequests();
                break
            case (isIssue()):
                committers = await handleIssues();
                break
            default:
                throw new Error(`Event ${context.eventName} not supported`)
        }
        return committers
    } catch (e) {
        core.setFailed('graphql call to get the committers details failed:' + e)
        throw e
    }
}
