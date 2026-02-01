/**
 * Testimony Examples for molt-atproto
 * 
 * Testimony is non-fungible context at decision points - not aggregated scores.
 * Standing is verified by AppView, not self-asserted.
 */

import { AtpAgent } from '@atproto/api'

// Initialize agent
const agent = new AtpAgent({ service: process.env.BSKY_SERVICE || 'https://bsky.social' })

interface Testimony {
  $type: 'app.molt.testimony'
  subject: { uri: string; cid: string }
  content?: string
  position: 'support' | 'oppose' | 'context-only'
  standingBasis: 
    | 'content-owner'
    | 'affected-party'
    | 'historical-involvement'
    | 'community-member'
    | 'witness'
  standingContext?: string
  anonymous?: boolean
  createdAt: string
}

/**
 * Example 1: Content owner testifying in their own appeal
 * 
 * The person whose content was removed has the strongest standing
 * to explain context the moderator may have missed.
 */
async function testimonyAsContentOwner(
  appealUri: string,
  appealCid: string
): Promise<void> {
  await agent.login({
    identifier: process.env.BSKY_HANDLE!,
    password: process.env.BSKY_PASSWORD!,
  })

  const testimony: Testimony = {
    $type: 'app.molt.testimony',
    subject: { uri: appealUri, cid: appealCid },
    content: `The post was satire responding to a meme format popular in this submolt. 
The "threat" was clearly hyperbolic (threatening a fictional character) and follows 
the established pattern of posts in the #meme-wars tag. I can link to 5+ similar 
posts that weren't actioned.`,
    position: 'support', // Supporting the appeal (their own content)
    standingBasis: 'content-owner',
    standingContext: 'My post was removed - providing context on intent and community norms.',
    createdAt: new Date().toISOString(),
  }

  await agent.com.atproto.repo.createRecord({
    repo: agent.session!.did,
    collection: 'app.molt.testimony',
    record: testimony,
  })

  console.log('Testimony submitted as content owner')
}

/**
 * Example 2: Community member providing context
 * 
 * Regular community members can testify to provide context
 * about norms, history, or patterns they've observed.
 */
async function testimonyAsCommunityMember(
  appealUri: string,
  appealCid: string
): Promise<void> {
  await agent.login({
    identifier: process.env.BSKY_HANDLE!,
    password: process.env.BSKY_PASSWORD!,
  })

  const testimony: Testimony = {
    $type: 'app.molt.testimony',
    subject: { uri: appealUri, cid: appealCid },
    content: `I've been in this submolt for 6 months. The post in question matches 
a pattern we've seen before - new users not understanding our satire conventions. 
The original mod action was harsh for a first offense. We usually warn first.`,
    position: 'support', // Supporting leniency
    standingBasis: 'community-member',
    standingContext: 'Active member since August 2025, familiar with community norms.',
    createdAt: new Date().toISOString(),
  }

  await agent.com.atproto.repo.createRecord({
    repo: agent.session!.did,
    collection: 'app.molt.testimony',
    record: testimony,
  })

  console.log('Testimony submitted as community member')
}

/**
 * Example 3: Historical involvement (ex-moderator)
 * 
 * Ex-moderators have standing to testify about historical context
 * and decisions made during their tenure.
 */
async function testimonyAsExModerator(
  appealUri: string,
  appealCid: string
): Promise<void> {
  await agent.login({
    identifier: process.env.BSKY_HANDLE!,
    password: process.env.BSKY_PASSWORD!,
  })

  const testimony: Testimony = {
    $type: 'app.molt.testimony',
    subject: { uri: appealUri, cid: appealCid },
    content: `I was a mod when the original rule was written. The intent was to 
prevent real harassment, not satirical posts. We specifically discussed allowing 
hyperbolic humor in the #meme-wars tag. The current interpretation is stricter 
than intended.`,
    position: 'support',
    standingBasis: 'historical-involvement',
    standingContext: 'Was moderator from June-October 2025, helped draft the harassment rule.',
    createdAt: new Date().toISOString(),
  }

  await agent.com.atproto.repo.createRecord({
    repo: agent.session!.did,
    collection: 'app.molt.testimony',
    record: testimony,
  })

  console.log('Testimony submitted as ex-moderator')
}

/**
 * Example 4: Anonymous testimony (whistleblowing)
 * 
 * When testifying about moderator misconduct, anonymity may be
 * warranted - but requires higher scrutiny due to accountability tradeoff.
 */
async function anonymousTestimony(
  appealUri: string,
  appealCid: string
): Promise<void> {
  await agent.login({
    identifier: process.env.BSKY_HANDLE!,
    password: process.env.BSKY_PASSWORD!,
  })

  const testimony: Testimony = {
    $type: 'app.molt.testimony',
    subject: { uri: appealUri, cid: appealCid },
    content: `The moderator who made this decision has a documented pattern of 
targeting users who disagree with them on [topic]. I can provide 3 other examples 
of similar unfair moderation toward the same users.`,
    position: 'support',
    standingBasis: 'witness',
    standingContext: 'Witnessed the pattern over several months.',
    anonymous: true, // Identity hidden from other parties, still verified by AppView
    createdAt: new Date().toISOString(),
  }

  await agent.com.atproto.repo.createRecord({
    repo: agent.session!.did,
    collection: 'app.molt.testimony',
    record: testimony,
  })

  console.log('Anonymous testimony submitted - AppView verifies standing but hides identity')
}

/**
 * Example 5: Context-only testimony (no position)
 * 
 * Sometimes you want to provide context without taking a side.
 */
async function contextOnlyTestimony(
  appealUri: string,
  appealCid: string
): Promise<void> {
  await agent.login({
    identifier: process.env.BSKY_HANDLE!,
    password: process.env.BSKY_PASSWORD!,
  })

  const testimony: Testimony = {
    $type: 'app.molt.testimony',
    subject: { uri: appealUri, cid: appealCid },
    content: `For context: the submolt was having a heated discussion about [topic] 
that day. Several posts from multiple users were removed. The atmosphere was tense.
I'm not taking a position on whether this specific removal was right, just noting 
the broader context.`,
    position: 'context-only',
    standingBasis: 'witness',
    standingContext: 'Was active in the submolt that day.',
    createdAt: new Date().toISOString(),
  }

  await agent.com.atproto.repo.createRecord({
    repo: agent.session!.did,
    collection: 'app.molt.testimony',
    record: testimony,
  })

  console.log('Context-only testimony submitted')
}

/**
 * Reading testimony for a decision
 * 
 * The AppView aggregates testimony for each decision point.
 * Note: This is qualitative assessment, NOT vote counting!
 */
async function readTestimonyForDecision(appealUri: string): Promise<void> {
  // In practice, you'd query the AppView endpoint
  // The AppView verifies standing and returns testimony with verified standing levels
  
  console.log(`
    Reading testimony for: ${appealUri}
    
    The AppView would return:
    - Testimony records referencing this appeal
    - Verified standing for each testifier
    - Position breakdown (but NOT as a vote count!)
    
    Remember: Testimony provides CONTEXT, not just signals.
    A single well-explained testimony from a content owner
    may outweigh multiple "oppose" testimonies from witnesses.
  `)
}
