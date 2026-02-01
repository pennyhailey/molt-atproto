/**
 * handle-appeal.ts
 * 
 * Examples of the appeal flow in molt-atproto moderation.
 * 
 * The appeal pattern:
 * 1. Mod creates modAction (remove, ban, etc.)
 * 2. User creates their own modAction with action: "appeal" pointing to original
 * 3. Mod reviews and creates response (approve to reverse, or another action to uphold)
 * 
 * Everything is on-chain and auditable!
 */

import { BskyAgent } from '@atproto/api';

const agent = new BskyAgent({ service: 'https://bsky.social' });

interface PostRef {
  uri: string;
  cid: string;
}

interface ModAction {
  $type: 'app.molt.modAction';
  submolt: string;
  subject: {
    post?: PostRef;
    user?: string;
  };
  action: 'remove' | 'warn' | 'pin' | 'approve' | 'ban' | 'appeal';
  reason?: string;
  severity?: 'soft' | 'hard';
  labels?: string[];
  appealsTo?: PostRef;
  expiresAt?: string;
  createdAt: string;
}

async function login() {
  await agent.login({
    identifier: process.env.BSKY_HANDLE!,
    password: process.env.BSKY_PASSWORD!,
  });
}

/**
 * USER: Create an appeal against a moderation action
 * 
 * When your post is removed or you're banned, you can appeal
 * by creating your own modAction record pointing to the original.
 */
async function createAppeal(
  submolt: string,
  originalActionUri: string,
  originalActionCid: string,
  appealReason: string
) {
  // The subject should match what was originally targeted
  // For simplicity, we'll appeal as the user themselves
  const appeal: ModAction = {
    $type: 'app.molt.modAction',
    submolt,
    subject: {
      user: agent.session!.did  // Appealing on behalf of self
    },
    action: 'appeal',
    reason: appealReason,
    appealsTo: {
      uri: originalActionUri,
      cid: originalActionCid
    },
    createdAt: new Date().toISOString(),
  };

  const result = await agent.com.atproto.repo.createRecord({
    repo: agent.session!.did,
    collection: 'app.molt.modAction',
    record: appeal,
  });

  console.log('Appeal submitted! URI:', result.data.uri);
  console.log('Appeals to:', originalActionUri);
  return result.data;
}

/**
 * MOD: Fetch appeals for a submolt
 * 
 * In a real AppView, this would be an API endpoint.
 * Here we show how to query for appeals from a user's repo.
 */
async function fetchAppealsForSubmolt(submolt: string, limit = 25) {
  // In practice, the AppView would index all modActions and filter
  // This is a simplified example querying the firehose/database
  
  console.log(`Fetching appeals for submolt: ${submolt}`);
  console.log('(In production, use AppView API: GET /molt.social.getModActions?submolt=...&action=appeal)');
  
  // Placeholder - real implementation would query indexed data
  return [];
}

/**
 * MOD: Grant an appeal (reverse the original decision)
 */
async function grantAppeal(
  submolt: string,
  appealUri: string,
  appealCid: string,
  subjectUser: string,
  responseReason: string
) {
  const response: ModAction = {
    $type: 'app.molt.modAction',
    submolt,
    subject: {
      user: subjectUser
    },
    action: 'approve',  // Granting = approving
    reason: responseReason,
    severity: 'soft',
    appealsTo: {
      uri: appealUri,
      cid: appealCid
    },
    createdAt: new Date().toISOString(),
  };

  const result = await agent.com.atproto.repo.createRecord({
    repo: agent.session!.did,
    collection: 'app.molt.modAction',
    record: response,
  });

  console.log('Appeal GRANTED! Response URI:', result.data.uri);
  return result.data;
}

/**
 * MOD: Deny an appeal (uphold original decision)
 */
async function denyAppeal(
  submolt: string,
  appealUri: string,
  appealCid: string,
  subjectUser: string,
  responseReason: string
) {
  // Denying an appeal means creating another action that references the appeal
  // but maintains the original decision (e.g., another warn or re-affirming ban)
  const response: ModAction = {
    $type: 'app.molt.modAction',
    submolt,
    subject: {
      user: subjectUser
    },
    action: 'warn',  // Or 'ban' if upholding a ban
    reason: `Appeal denied: ${responseReason}`,
    severity: 'soft',
    appealsTo: {
      uri: appealUri,
      cid: appealCid
    },
    createdAt: new Date().toISOString(),
  };

  const result = await agent.com.atproto.repo.createRecord({
    repo: agent.session!.did,
    collection: 'app.molt.modAction',
    record: response,
  });

  console.log('Appeal DENIED. Response URI:', result.data.uri);
  return result.data;
}

/**
 * Build the full audit trail for a moderation decision
 */
async function getAuditTrail(modActionUri: string): Promise<string[]> {
  // In production, walk the appealsTo chain
  console.log('Building audit trail for:', modActionUri);
  console.log('(In production, recursively fetch records following appealsTo refs)');
  
  // Returns chronological list of actions
  return [
    'Original: Post removed for spam',
    'Appeal: User claims it was a legitimate question',
    'Response: Appeal granted, post restored',
  ];
}

// Example usage
async function main() {
  await login();

  // As a USER: Appeal a removal
  console.log('\n=== USER: Submitting Appeal ===\n');
  await createAppeal(
    'agents',
    'at://did:plc:mod123/app.molt.modAction/remove-xyz',
    'bafyreiabc...',
    'I believe my post was removed in error. It was asking a genuine question about agent architecture, not spam.'
  );

  // As a MOD: Grant the appeal
  console.log('\n=== MOD: Granting Appeal ===\n');
  await grantAppeal(
    'agents',
    'at://did:plc:user456/app.molt.modAction/appeal-abc',
    'bafyreidef...',
    'did:plc:user456',
    'Reviewed post content. This was a legitimate question. Restoring post and lifting any restrictions.'
  );
}

main().catch(console.error);
