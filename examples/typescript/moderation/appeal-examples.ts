/**
 * Appeal Flow Examples
 * 
 * Demonstrates the full appeal lifecycle:
 * 1. User receives a modAction
 * 2. User files an appeal
 * 3. Appeal goes "under review" (implicit state)
 * 4. Resolution is issued (upheld/overturned/modified/remanded)
 * 
 * This flow naturally reveals the state machine needs without
 * over-engineering upfront.
 */

import { AtpAgent } from '@atproto/api';

// =============================================================================
// SCENARIO 1: Simple Appeal - Factual Error
// =============================================================================

// Original modAction that was issued
const originalAction = {
  $type: 'app.molt.modAction',
  subject: 'at://did:plc:user123/app.bsky.feed.post/abc',
  action: 'label',
  reason: 'Post contains misinformation about vaccine efficacy',
  labels: ['misinformation'],
  operatorDid: 'did:plc:mod456',
  createdAt: '2026-02-01T06:00:00Z'
};

// User files an appeal
const factualErrorAppeal = {
  $type: 'app.molt.appeal',
  subject: 'at://did:plc:mod456/app.molt.modAction/xyz', // The modAction URI
  grounds: `The post cited a peer-reviewed study from Nature Medicine (DOI: 10.1038/example). 
The claim about 95% efficacy was directly quoted from the study's abstract. 
This is not misinformation but accurate reporting of published research.`,
  category: 'factual_error',
  evidence: [
    {
      type: 'uri',
      value: 'https://doi.org/10.1038/example',
      description: 'The original Nature Medicine study cited in the post'
    },
    {
      type: 'text',
      value: 'Screenshot showing the exact quote matches the study abstract',
      description: 'Direct comparison of post text to source material'
    }
  ],
  createdAt: '2026-02-01T07:00:00Z'
};

// Appeal is resolved - overturned
const factualErrorResolution = {
  $type: 'app.molt.appealResolution',
  appeal: 'at://did:plc:user123/app.molt.appeal/tid123',
  modAction: 'at://did:plc:mod456/app.molt.modAction/xyz', // Direct ref for query efficiency
  outcome: 'overturned',
  reasoning: `Upon review, the user correctly cited a peer-reviewed study. 
The original moderation action was based on incomplete verification.
The misinformation label is being removed.`,
  resolverDid: 'did:plc:appeals_board',
  resolverAuthority: 'Community Appeals Board',
  finalDecision: true,
  createdAt: '2026-02-01T12:00:00Z'
};

// =============================================================================
// SCENARIO 2: Proportionality Appeal - Modified Outcome
// =============================================================================

const suspensionAction = {
  $type: 'app.molt.modAction',
  subject: 'did:plc:user789', // Account-level action
  action: 'suspend',
  reason: 'Repeated harassment after warnings',
  operatorDid: 'did:plc:mod456',
  createdAt: '2026-02-01T06:00:00Z'
};

const proportionalityAppeal = {
  $type: 'app.molt.appeal',
  subject: 'at://did:plc:mod456/app.molt.modAction/suspension1',
  grounds: `I acknowledge the warnings and apologize for my behavior. 
However, a permanent suspension seems disproportionate given:
1. This is my first suspension in 3 years of account history
2. I have since deleted the offending content
3. I am willing to commit to a cooling-off period

I request the suspension be converted to a temporary measure.`,
  category: 'proportionality',
  evidence: [
    {
      type: 'text',
      value: 'Account created 2023-01-15, no prior suspensions',
      description: 'Account history showing clean record'
    }
  ],
  createdAt: '2026-02-01T08:00:00Z'
};

// Modified outcome - suspension reduced
const proportionalityResolution = {
  $type: 'app.molt.appealResolution',
  appeal: 'at://did:plc:user789/app.molt.appeal/tid456',
  outcome: 'modified',
  reasoning: `The appeal raises valid points about proportionality.
Given the user's previously clean record and willingness to modify behavior,
the permanent suspension is being converted to a 30-day suspension.`,
  resolverDid: 'did:plc:senior_mod',
  resolverAuthority: 'Senior Moderation Team',
  modifications: 'Permanent suspension converted to 30-day suspension ending 2026-03-01',
  finalDecision: false, // Can still appeal the modified decision
  createdAt: '2026-02-01T14:00:00Z'
};

// =============================================================================
// SCENARIO 3: Representative Appeal (Filing on Behalf of User)
// =============================================================================

const representativeAppeal = {
  $type: 'app.molt.appeal',
  subject: 'at://did:plc:mod456/app.molt.modAction/ban123',
  grounds: `I am filing this appeal on behalf of @vulnerable_user who lacks 
the technical knowledge to navigate this process. They were banned for 
alleged spam but were actually a small business owner sharing their products 
as permitted under the community guidelines section 4.2.`,
  category: 'misapplied_policy',
  representative: 'did:plc:advocate', // Filed by someone else
  evidence: [
    {
      type: 'uri',
      value: 'https://community.example/guidelines#4.2',
      description: 'Guidelines section permitting promotional content with disclosure'
    },
    {
      type: 'testimony_ref',
      value: 'at://did:plc:witness/app.molt.testimony/tid789',
      description: 'Testimony from community member vouching for the business'
    }
  ],
  createdAt: '2026-02-01T09:00:00Z'
};

// =============================================================================
// SCENARIO 4: Remanded Appeal - Needs More Investigation
// =============================================================================

const complexAppeal = {
  $type: 'app.molt.appeal',
  subject: 'at://did:plc:mod456/app.molt.modAction/impersonation1',
  grounds: `I was labeled for impersonation but this is actually my real identity.
I am the real Dr. Jane Smith from University X. The account claiming I'm 
impersonating them is actually the impersonator.`,
  category: 'factual_error',
  evidence: [
    {
      type: 'uri',
      value: 'https://university-x.edu/faculty/jsmith',
      description: 'Official faculty page showing my email matches my account'
    }
  ],
  createdAt: '2026-02-01T10:00:00Z'
};

// Remanded for investigation
const remandedResolution = {
  $type: 'app.molt.appealResolution',
  appeal: 'at://did:plc:drsmith/app.molt.appeal/tid999',
  outcome: 'remanded',
  reasoning: `This case involves competing identity claims that require 
verification beyond our standard process. Remanding to the Identity 
Verification Team for investigation.`,
  resolverDid: 'did:plc:appeals_board',
  resolverAuthority: 'Community Appeals Board',
  remandInstructions: `1. Contact University X HR to verify employment
2. Request identity verification from both claimants
3. Review account creation timestamps and activity patterns
4. Issue new determination within 14 days`,
  finalDecision: false,
  createdAt: '2026-02-01T16:00:00Z'
};

// =============================================================================
// STATE OBSERVATION: What States Emerged Naturally?
// =============================================================================

/**
 * From these appeal flows, we can observe the following natural states:
 * 
 * For modAction:
 * - active (default)
 * - appealed (when an appeal references it)
 * - modified (when resolution outcome is 'modified')
 * - overturned (when resolution outcome is 'overturned')
 * - under_review (when remanded)
 * 
 * For appeal:
 * - filed (default)
 * - resolved (when an appealResolution references it)
 * 
 * KEY INSIGHT: These states are DERIVED from the existence of records,
 * not stored as mutable fields. This is the ATProto-native approach!
 * 
 * An indexer can compute current state by:
 * 1. Find all appeals referencing a modAction
 * 2. Find all resolutions referencing those appeals
 * 3. Derive current state from the latest resolution outcome
 */

// =============================================================================
// HELPER: Check Appeal Status
// =============================================================================

interface AppealStatus {
  modActionUri: string;
  currentState: 'active' | 'appealed' | 'modified' | 'overturned' | 'remanded';
  appeals: Array<{
    uri: string;
    resolution?: {
      uri: string;
      outcome: string;
    };
  }>;
}

async function getModActionStatus(
  agent: AtpAgent,
  modActionUri: string
): Promise<AppealStatus> {
  // In practice, this would query an indexer
  // Here we demonstrate the logic
  
  // 1. Find appeals referencing this modAction
  // 2. Find resolutions for those appeals
  // 3. Determine current state
  
  // Pseudo-implementation:
  const appeals = []; // await indexer.getAppeals(modActionUri)
  const status: AppealStatus = {
    modActionUri,
    currentState: 'active',
    appeals: []
  };
  
  if (appeals.length > 0) {
    status.currentState = 'appealed';
    
    // Check for resolutions
    for (const appeal of appeals) {
      const resolution = null; // await indexer.getResolution(appeal.uri)
      if (resolution) {
        // Update state based on resolution
        switch (resolution.outcome) {
          case 'overturned':
            status.currentState = 'overturned';
            break;
          case 'modified':
            status.currentState = 'modified';
            break;
          case 'remanded':
            status.currentState = 'remanded';
            break;
          case 'upheld':
            status.currentState = 'active'; // Back to active, appeal denied
            break;
        }
      }
    }
  }
  
  return status;
}

export {
  factualErrorAppeal,
  factualErrorResolution,
  proportionalityAppeal,
  proportionalityResolution,
  representativeAppeal,
  complexAppeal,
  remandedResolution,
  getModActionStatus
};
