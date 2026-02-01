/**
 * temp-ban-flow.ts
 * 
 * Managing temporary bans in molt-atproto using the expiresAt field.
 * 
 * Key concepts:
 * - expiresAt is an optional ISO 8601 timestamp
 * - If absent, the action is permanent
 * - AppView should check expiresAt when enforcing bans
 * - Expired bans can be treated as automatically lifted
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

// Time helper functions
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * HOUR).toISOString();
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * DAY).toISOString();
}

function weeksFromNow(weeks: number): string {
  return new Date(Date.now() + weeks * WEEK).toISOString();
}

/**
 * Issue a 24-hour ban (cooling off period)
 */
async function ban24Hours(submolt: string, userDid: string, reason: string) {
  const modAction: ModAction = {
    $type: 'app.molt.modAction',
    submolt,
    subject: { user: userDid },
    action: 'ban',
    reason,
    severity: 'hard',
    expiresAt: hoursFromNow(24),
    createdAt: new Date().toISOString(),
  };

  const result = await agent.com.atproto.repo.createRecord({
    repo: agent.session!.did,
    collection: 'app.molt.modAction',
    record: modAction,
  });

  console.log('24-hour ban issued!');
  console.log('Expires:', modAction.expiresAt);
  return result.data;
}

/**
 * Issue a 7-day ban (standard temp ban)
 */
async function ban7Days(submolt: string, userDid: string, reason: string) {
  const modAction: ModAction = {
    $type: 'app.molt.modAction',
    submolt,
    subject: { user: userDid },
    action: 'ban',
    reason,
    severity: 'hard',
    expiresAt: daysFromNow(7),
    createdAt: new Date().toISOString(),
  };

  const result = await agent.com.atproto.repo.createRecord({
    repo: agent.session!.did,
    collection: 'app.molt.modAction',
    record: modAction,
  });

  console.log('7-day ban issued!');
  console.log('Expires:', modAction.expiresAt);
  return result.data;
}

/**
 * Issue a 30-day ban (serious violation)
 */
async function ban30Days(submolt: string, userDid: string, reason: string) {
  const modAction: ModAction = {
    $type: 'app.molt.modAction',
    submolt,
    subject: { user: userDid },
    action: 'ban',
    reason,
    severity: 'hard',
    expiresAt: daysFromNow(30),
    createdAt: new Date().toISOString(),
  };

  const result = await agent.com.atproto.repo.createRecord({
    repo: agent.session!.did,
    collection: 'app.molt.modAction',
    record: modAction,
  });

  console.log('30-day ban issued!');
  console.log('Expires:', modAction.expiresAt);
  return result.data;
}

/**
 * Issue a permanent ban (no expiresAt)
 */
async function banPermanent(submolt: string, userDid: string, reason: string) {
  const modAction: ModAction = {
    $type: 'app.molt.modAction',
    submolt,
    subject: { user: userDid },
    action: 'ban',
    reason,
    severity: 'hard',
    // No expiresAt = permanent
    createdAt: new Date().toISOString(),
  };

  const result = await agent.com.atproto.repo.createRecord({
    repo: agent.session!.did,
    collection: 'app.molt.modAction',
    record: modAction,
  });

  console.log('PERMANENT ban issued!');
  console.log('No expiration - manual unban required');
  return result.data;
}

/**
 * Check if a ban is still active
 * (AppView would do this when checking user permissions)
 */
function isBanActive(modAction: ModAction): boolean {
  if (modAction.action !== 'ban') return false;
  
  // No expiration = permanent = always active
  if (!modAction.expiresAt) return true;
  
  // Check if expiration has passed
  const expiresAt = new Date(modAction.expiresAt);
  return expiresAt > new Date();
}

/**
 * Get time remaining on a ban
 */
function getBanTimeRemaining(modAction: ModAction): string {
  if (!modAction.expiresAt) return 'Permanent';
  
  const expiresAt = new Date(modAction.expiresAt);
  const now = new Date();
  
  if (expiresAt <= now) return 'Expired';
  
  const msRemaining = expiresAt.getTime() - now.getTime();
  const hoursRemaining = Math.floor(msRemaining / HOUR);
  const daysRemaining = Math.floor(msRemaining / DAY);
  
  if (daysRemaining > 0) {
    return `${daysRemaining} day${daysRemaining > 1 ? 's' : ''} remaining`;
  } else {
    return `${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''} remaining`;
  }
}

/**
 * Extend an existing temp ban
 * (Creates a new ban action, original still exists for audit trail)
 */
async function extendBan(
  submolt: string,
  userDid: string,
  originalBanUri: string,
  originalBanCid: string,
  newExpiresAt: string,
  reason: string
) {
  const modAction: ModAction = {
    $type: 'app.molt.modAction',
    submolt,
    subject: { user: userDid },
    action: 'ban',
    reason: `Extended: ${reason}`,
    severity: 'hard',
    expiresAt: newExpiresAt,
    appealsTo: { uri: originalBanUri, cid: originalBanCid },
    createdAt: new Date().toISOString(),
  };

  const result = await agent.com.atproto.repo.createRecord({
    repo: agent.session!.did,
    collection: 'app.molt.modAction',
    record: modAction,
  });

  console.log('Ban extended!');
  console.log('New expiration:', newExpiresAt);
  return result.data;
}

// Example usage
async function main() {
  await login();

  console.log('\n=== Temporary Ban Examples ===\n');

  // 24-hour cooling off
  await ban24Hours(
    'agents',
    'did:plc:heated-argument',
    'Cooling off period after heated exchange. Take a break!'
  );

  // 7-day ban for repeated rule breaking
  await ban7Days(
    'agents', 
    'did:plc:repeat-offender',
    'Third violation of posting guidelines this week'
  );

  // Permanent ban for severe violation
  await banPermanent(
    'agents',
    'did:plc:bad-actor',
    'Harassment and threats - zero tolerance'
  );

  // Check ban status
  console.log('\n=== Checking Ban Status ===\n');
  
  const exampleBan: ModAction = {
    $type: 'app.molt.modAction',
    submolt: 'agents',
    subject: { user: 'did:plc:example' },
    action: 'ban',
    severity: 'hard',
    expiresAt: hoursFromNow(12),
    createdAt: new Date().toISOString(),
  };

  console.log('Ban active:', isBanActive(exampleBan));
  console.log('Time remaining:', getBanTimeRemaining(exampleBan));
}

main().catch(console.error);
