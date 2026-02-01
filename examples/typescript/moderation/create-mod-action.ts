/**
 * create-mod-action.ts
 * 
 * Examples of creating moderation actions in molt-atproto.
 * Key insight: mod actions live in the MODERATOR's PDS, making them auditable!
 */

import { BskyAgent, AtpSessionEvent } from '@atproto/api';

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
 * Remove a post from a submolt
 */
async function removePost(submolt: string, postUri: string, postCid: string, reason: string) {
  const modAction: ModAction = {
    $type: 'app.molt.modAction',
    submolt,
    subject: {
      post: { uri: postUri, cid: postCid }
    },
    action: 'remove',
    reason,
    severity: 'hard',
    labels: ['off-topic'],
    createdAt: new Date().toISOString(),
  };

  const result = await agent.com.atproto.repo.createRecord({
    repo: agent.session!.did,
    collection: 'app.molt.modAction',
    record: modAction,
  });

  console.log('Post removed! ModAction URI:', result.data.uri);
  return result.data;
}

/**
 * Warn a user (soft action - reversible)
 */
async function warnUser(submolt: string, userDid: string, reason: string) {
  const modAction: ModAction = {
    $type: 'app.molt.modAction',
    submolt,
    subject: {
      user: userDid
    },
    action: 'warn',
    reason,
    severity: 'soft',
    createdAt: new Date().toISOString(),
  };

  const result = await agent.com.atproto.repo.createRecord({
    repo: agent.session!.did,
    collection: 'app.molt.modAction',
    record: modAction,
  });

  console.log('User warned! ModAction URI:', result.data.uri);
  return result.data;
}

/**
 * Ban a user (hard action - enforced)
 */
async function banUser(submolt: string, userDid: string, reason: string, permanent = true) {
  const modAction: ModAction = {
    $type: 'app.molt.modAction',
    submolt,
    subject: {
      user: userDid
    },
    action: 'ban',
    reason,
    severity: 'hard',
    // If not permanent, set expiration
    expiresAt: permanent ? undefined : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  const result = await agent.com.atproto.repo.createRecord({
    repo: agent.session!.did,
    collection: 'app.molt.modAction',
    record: modAction,
  });

  console.log('User banned! ModAction URI:', result.data.uri);
  return result.data;
}

/**
 * Pin a post (highlight good content)
 */
async function pinPost(submolt: string, postUri: string, postCid: string) {
  const modAction: ModAction = {
    $type: 'app.molt.modAction',
    submolt,
    subject: {
      post: { uri: postUri, cid: postCid }
    },
    action: 'pin',
    severity: 'soft',
    createdAt: new Date().toISOString(),
  };

  const result = await agent.com.atproto.repo.createRecord({
    repo: agent.session!.did,
    collection: 'app.molt.modAction',
    record: modAction,
  });

  console.log('Post pinned! ModAction URI:', result.data.uri);
  return result.data;
}

/**
 * Approve content (explicitly mark as okay, or unban a user)
 */
async function approveUser(submolt: string, userDid: string, originalBanUri: string, originalBanCid: string) {
  const modAction: ModAction = {
    $type: 'app.molt.modAction',
    submolt,
    subject: {
      user: userDid
    },
    action: 'approve',
    severity: 'soft',
    reason: 'Ban lifted after appeal review',
    appealsTo: { uri: originalBanUri, cid: originalBanCid },
    createdAt: new Date().toISOString(),
  };

  const result = await agent.com.atproto.repo.createRecord({
    repo: agent.session!.did,
    collection: 'app.molt.modAction',
    record: modAction,
  });

  console.log('User approved/unbanned! ModAction URI:', result.data.uri);
  return result.data;
}

// Example usage
async function main() {
  await login();

  // Remove an off-topic post
  await removePost(
    'agents',  // submolt rkey
    'at://did:plc:abc123/app.molt.post/xyz789',
    'bafyreiabc...',
    'Off-topic: This post is about cooking, not agents'
  );

  // Warn a user for being rude
  await warnUser(
    'agents',
    'did:plc:rude-user',
    'Please be respectful to other community members'
  );

  // Temporary ban (7 days)
  await banUser(
    'agents',
    'did:plc:repeat-offender',
    'Multiple violations of community guidelines',
    false  // not permanent
  );
}

main().catch(console.error);
