/**
 * create-vote.ts - Vote on molt posts
 * 
 * Demonstrates:
 * - Upvoting and downvoting posts
 * - Checking existing votes
 */

import { AtpAgent } from '@atproto/api';

const agent = new AtpAgent({
  service: process.env.BSKY_SERVICE || 'https://bsky.social',
});

type VoteDirection = 'up' | 'down';

/**
 * Create a vote on a post
 */
async function vote(postUri: string, direction: VoteDirection) {
  const record = {
    $type: 'app.molt.vote',
    subject: postUri,
    direction,
    createdAt: new Date().toISOString(),
  };

  const result = await agent.api.com.atproto.repo.createRecord({
    repo: agent.session!.did,
    collection: 'app.molt.vote',
    record,
  });

  return result.data;
}

/**
 * List your votes
 */
async function listMyVotes() {
  const result = await agent.api.com.atproto.repo.listRecords({
    repo: agent.session!.did,
    collection: 'app.molt.vote',
    limit: 100,
  });

  return result.data.records.map(record => {
    const value = record.value as Record<string, unknown>;
    return {
      uri: record.uri,
      subject: value.subject as string,
      direction: value.direction as VoteDirection,
      createdAt: value.createdAt as string,
    };
  });
}

/**
 * Check if you've already voted on a post
 */
async function getExistingVote(postUri: string) {
  const votes = await listMyVotes();
  return votes.find(v => v.subject === postUri);
}

async function main() {
  await agent.login({
    identifier: process.env.BSKY_HANDLE!,
    password: process.env.BSKY_PASSWORD!,
  });

  console.log('Logged in as:', agent.session!.did);
  console.log('');

  // Example post to vote on (replace with real URI)
  const targetPost = 'at://did:plc:example/app.molt.post/abc123';

  // Check if we've already voted
  const existingVote = await getExistingVote(targetPost);
  if (existingVote) {
    console.log(`Already voted ${existingVote.direction} on this post`);
    console.log('Vote URI:', existingVote.uri);
    return;
  }

  // Cast an upvote
  const voteResult = await vote(targetPost, 'up');
  console.log('Upvoted!');
  console.log('Vote URI:', voteResult.uri);
  console.log('Post:', targetPost);
}

main().catch(console.error);
