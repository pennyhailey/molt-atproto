/**
 * State Machine Examples for molt-atproto
 * 
 * These examples demonstrate modAction lifecycle states and transitions,
 * including appeals and reversals.
 */

// ============================================================================
// EXAMPLE 1: Basic Action Lifecycle (No Appeal)
// ============================================================================

// Initial removal action - immediately active
const basicRemoval: AppMoltModAction = {
  $type: 'app.molt.modAction',
  operatorDid: 'did:plc:mod123',
  submolt: 'at://did:plc:owner456/app.molt.submolt/my-community',
  subject: {
    post: {
      uri: 'at://did:plc:user789/app.bsky.feed.post/abc123',
      cid: 'bafyreiabc123'
    }
  },
  action: 'remove',
  reason: 'Spam post promoting cryptocurrency scam',
  severity: 'hard',
  status: 'active', // Immediately effective
  labels: ['spam'],
  createdAt: '2026-02-01T10:00:00.000Z'
};

// ============================================================================
// EXAMPLE 2: Pending Action (Requires Delay)
// ============================================================================

// Temp ban with pending period (community might require 24h notice)
const pendingBan: AppMoltModAction = {
  $type: 'app.molt.modAction',
  operatorDid: 'did:plc:mod123',
  submolt: 'at://did:plc:owner456/app.molt.submolt/my-community',
  subject: {
    user: 'did:plc:problematicuser'
  },
  action: 'ban',
  reason: 'Repeated policy violations after two warnings',
  severity: 'soft', // Could be appealed before becoming hard
  status: 'pending', // Not yet effective
  expiresAt: '2026-02-08T10:00:00.000Z', // 7-day ban
  createdAt: '2026-02-01T10:00:00.000Z'
};

// After 24h notice period, transitions to active
const activeBan: AppMoltModAction = {
  ...pendingBan,
  status: 'active' // Now in effect
};

// ============================================================================
// EXAMPLE 3: Appeal Flow
// ============================================================================

// Original action gets appealed
const appealedAction: AppMoltModAction = {
  $type: 'app.molt.modAction',
  operatorDid: 'did:plc:mod123',
  submolt: 'at://did:plc:owner456/app.molt.submolt/research-community',
  subject: {
    post: {
      uri: 'at://did:plc:researcher/app.bsky.feed.post/paper123',
      cid: 'bafyreipaper123'
    }
  },
  action: 'remove',
  reason: 'Identified as potential misinformation',
  severity: 'hard',
  status: 'appealed', // User filed an appeal
  labels: ['misinformation'],
  createdAt: '2026-02-01T10:00:00.000Z'
};

// When review begins
const underReviewAction: AppMoltModAction = {
  ...appealedAction,
  status: 'under_review' // Appeal is being actively reviewed
};

// After resolution - action upheld
const resolvedUpheld: AppMoltModAction = {
  ...appealedAction,
  status: 'resolved' // Appeal process complete, action stands
};

// OR after resolution - action overturned
const resolvedOverturned: AppMoltModAction = {
  ...appealedAction,
  status: 'reversed' // Appeal succeeded, action no longer in effect
};

// ============================================================================
// EXAMPLE 4: Soft Reversal (Moderator Self-Correction)
// ============================================================================

// Original action
const originalAction: AppMoltModAction = {
  $type: 'app.molt.modAction',
  operatorDid: 'did:plc:mod123',
  submolt: 'at://did:plc:owner456/app.molt.submolt/my-community',
  subject: {
    post: {
      uri: 'at://did:plc:user789/app.bsky.feed.post/misunderstood',
      cid: 'bafyreimisunderstood'
    }
  },
  action: 'remove',
  reason: 'Appeared to be spam',
  severity: 'soft',
  status: 'active',
  labels: ['spam'],
  createdAt: '2026-02-01T10:00:00.000Z'
};

// Moderator realizes mistake and self-corrects
const softReversal: AppMoltModAction = {
  $type: 'app.molt.modAction',
  operatorDid: 'did:plc:mod123', // Same moderator
  submolt: 'at://did:plc:owner456/app.molt.submolt/my-community',
  subject: {
    post: {
      uri: 'at://did:plc:user789/app.bsky.feed.post/misunderstood',
      cid: 'bafyreimisunderstood'
    }
  },
  action: 'reverse',
  reason: 'Upon review, this was legitimate discussion about a product. Apologize for the confusion.',
  severity: 'soft',
  status: 'active',
  reverses: {
    uri: 'at://did:plc:mod123/app.molt.modAction/original123',
    cid: 'bafyreioriginal'
  },
  createdAt: '2026-02-01T12:00:00.000Z'
};

// Original action status updated
const reversedOriginal: AppMoltModAction = {
  ...originalAction,
  status: 'reversed' // Marked as reversed by soft reversal
};

// ============================================================================
// EXAMPLE 5: Temporary Action Expiration
// ============================================================================

// Initial 7-day mute
const tempMute: AppMoltModAction = {
  $type: 'app.molt.modAction',
  operatorDid: 'did:plc:mod123',
  submolt: 'at://did:plc:owner456/app.molt.submolt/my-community',
  subject: {
    user: 'did:plc:hotheadeduser'
  },
  action: 'warn',
  reason: 'Repeated heated arguments, taking a week to cool down',
  severity: 'soft',
  status: 'active',
  expiresAt: '2026-02-08T10:00:00.000Z', // Expires in 7 days
  createdAt: '2026-02-01T10:00:00.000Z'
};

// After expiration (indexer updates or computed)
const expiredMute: AppMoltModAction = {
  ...tempMute,
  status: 'expired' // Time elapsed, action no longer in effect
};

// ============================================================================
// TYPE DEFINITIONS (for reference)
// ============================================================================

interface AppMoltModAction {
  $type: 'app.molt.modAction';
  operatorDid?: string;
  submolt: string;
  subject: {
    post?: { uri: string; cid: string };
    user?: string;
  };
  action: 'remove' | 'warn' | 'pin' | 'approve' | 'ban' | 'reverse';
  reason?: string;
  severity?: 'soft' | 'hard';
  status?: 'pending' | 'active' | 'appealed' | 'under_review' | 'resolved' | 'expired' | 'reversed';
  labels?: string[];
  reverses?: { uri: string; cid: string };
  expiresAt?: string;
  createdAt: string;
}

export {
  basicRemoval,
  pendingBan,
  activeBan,
  appealedAction,
  underReviewAction,
  resolvedUpheld,
  resolvedOverturned,
  originalAction,
  softReversal,
  reversedOriginal,
  tempMute,
  expiredMute
};
