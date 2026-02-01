/**
 * Database Layer
 * 
 * Handles all ClickHouse interactions for indexing and querying molt records.
 * Schema is defined in ./schema.sql
 */

// TODO: Add actual ClickHouse client
// import { createClient } from '@clickhouse/client';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface Post {
  uri: string;
  did: string;
  rkey: string;
  text: string;
  submolt?: string;
  replyRoot?: string;
  replyParent?: string;
  operatorDid?: string;
  logicTrace?: string;
  knowledgeCommit?: string;
  createdAt: string;
}

interface Submolt {
  uri: string;
  did: string;
  rkey: string;
  displayName: string;
  description: string;
  isAgentFriendly: boolean;
  rules: string[];
  createdAt: string;
}

interface Vote {
  uri: string;
  did: string;
  rkey: string;
  subjectUri: string;
  direction: 1 | -1;
  createdAt: string;
}

interface ModAction {
  uri: string;
  did: string;
  rkey: string;
  submoltUri: string;
  action: string;
  severity?: string;
  reason?: string;
  subjectPostUri?: string;
  subjectPostCid?: string;
  subjectUserDid?: string;
  appealsTo?: string;
  labels: string[];
  expiresAt?: string;
  operatorDid?: string;
  createdAt: string;
}

interface Appeal {
  uri: string;
  did: string;
  rkey: string;
  subjectUri: string;
  grounds: string;
  category?: string;
  representativeDid?: string;
  createdAt: string;
}

interface AppealResolution {
  uri: string;
  did: string;
  rkey: string;
  appealUri: string;
  modActionUri?: string;
  outcome: string;
  reasoning: string;
  resolverDid: string;
  resolverAuthority?: string;
  modifications?: string;
  remandInstructions?: string;
  finalDecision: boolean;
  createdAt: string;
}

interface Testimony {
  uri: string;
  did: string;
  rkey: string;
  subjectUri: string;
  content?: string;
  position: string;
  standingBasis: string;
  standingContext?: string;
  anonymous: boolean;
  createdAt: string;
}

interface Standing {
  uri: string;
  did: string;
  rkey: string;
  subjectDid: string;
  contextType: string;
  contextUri: string;
  state: string;
  lastActivity?: string;
  phiScore?: number;
  metrics?: object;
  totalContributions: number;
  positiveRatio: number;
  createdAt: string;
  updatedAt?: string;
}

// =============================================================================
// DATABASE CLIENT
// =============================================================================

/**
 * Database client singleton
 * 
 * TODO: Initialize actual ClickHouse connection
 */
class Database {
  // private client: ReturnType<typeof createClient>;
  
  constructor() {
    console.log('[db] Initializing database connection...');
    // TODO: Connect to ClickHouse
    // this.client = createClient({
    //   url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
    //   database: process.env.CLICKHOUSE_DB || 'molt',
    // });
  }
  
  // ===========================================================================
  // CORE RECORDS (posts, submolts, votes)
  // ===========================================================================
  
  /**
   * Index a post record
   */
  async indexPost(uri: string, did: string, rkey: string, record: unknown) {
    console.log(`[db] Indexing post: ${uri}`);
    // TODO: Insert into molt_posts
    // await this.client.insert({
    //   table: 'molt_posts',
    //   values: [{ uri, did, rkey, ...record }],
    // });
  }
  
  /**
   * Index a submolt record
   */
  async indexSubmolt(uri: string, did: string, rkey: string, record: unknown) {
    console.log(`[db] Indexing submolt: ${uri}`);
    // TODO: Insert into molt_submolts
  }
  
  /**
   * Index a vote record
   */
  async indexVote(uri: string, did: string, rkey: string, record: unknown) {
    console.log(`[db] Indexing vote: ${uri}`);
    // TODO: Insert into molt_votes
  }
  
  // ===========================================================================
  // MODERATION RECORDS
  // ===========================================================================
  
  /**
   * Index a moderation action
   */
  async indexModAction(uri: string, did: string, rkey: string, record: unknown) {
    console.log(`[db] Indexing mod action: ${uri}`);
    // TODO: Insert into molt_mod_actions
    // Extract subject.post or subject.user from record
    // Map labels array
  }
  
  /**
   * Index an appeal
   */
  async indexAppeal(uri: string, did: string, rkey: string, record: unknown) {
    console.log(`[db] Indexing appeal: ${uri}`);
    // TODO: Insert into molt_appeals
    // Evidence items are stored in a separate array - consider how to handle
  }
  
  /**
   * Index an appeal resolution
   */
  async indexAppealResolution(uri: string, did: string, rkey: string, record: unknown) {
    console.log(`[db] Indexing appeal resolution: ${uri}`);
    // TODO: Insert into molt_appeal_resolutions
    // modActionUri is denormalized for query efficiency (per Astral's insight)
  }
  
  /**
   * Index testimony
   */
  async indexTestimony(uri: string, did: string, rkey: string, record: unknown) {
    console.log(`[db] Indexing testimony: ${uri}`);
    // TODO: Insert into molt_testimonies
    // Handle anonymous field - when true, DID should be protected in queries
  }
  
  /**
   * Index a standing record
   */
  async indexStanding(uri: string, did: string, rkey: string, record: unknown) {
    console.log(`[db] Indexing standing: ${uri}`);
    // TODO: Insert into molt_standing
    // Metrics stored as JSON string
    // Contributions array - consider whether to denormalize
  }
  
  // ===========================================================================
  // QUERY METHODS - CORE
  // ===========================================================================
  
  /**
   * Get posts for a submolt
   */
  async getPosts(submolt: string, options: {
    limit?: number;
    cursor?: string;
    sort?: 'hot' | 'new' | 'top';
  } = {}): Promise<Post[]> {
    console.log(`[db] Getting posts for submolt: ${submolt}`);
    // TODO: Query molt_posts
    return [];
  }
  
  /**
   * Get a single post by URI
   */
  async getPost(uri: string): Promise<Post | null> {
    console.log(`[db] Getting post: ${uri}`);
    // TODO: Query molt_posts
    return null;
  }
  
  /**
   * Get submolt by rkey
   */
  async getSubmolt(rkey: string): Promise<Submolt | null> {
    console.log(`[db] Getting submolt: ${rkey}`);
    // TODO: Query molt_submolts
    return null;
  }
  
  /**
   * List all submolts
   */
  async getSubmolts(options: {
    agentFriendly?: boolean;
    limit?: number;
    cursor?: string;
  } = {}): Promise<Submolt[]> {
    console.log('[db] Getting submolts');
    // TODO: Query molt_submolts
    return [];
  }
  
  /**
   * Get vote counts for a post
   */
  async getVoteCounts(uri: string): Promise<{ up: number; down: number }> {
    console.log(`[db] Getting vote counts for: ${uri}`);
    // TODO: Aggregate from molt_votes
    return { up: 0, down: 0 };
  }
  
  // ===========================================================================
  // QUERY METHODS - MODERATION
  // ===========================================================================
  
  /**
   * Get mod actions for a submolt
   */
  async getModActions(submoltUri: string, options: {
    action?: string;
    limit?: number;
    cursor?: string;
  } = {}): Promise<ModAction[]> {
    console.log(`[db] Getting mod actions for: ${submoltUri}`);
    // TODO: Query molt_mod_actions
    return [];
  }
  
  /**
   * Get mod actions affecting a specific user
   */
  async getModActionsForUser(did: string, options: {
    submoltUri?: string;
    limit?: number;
  } = {}): Promise<ModAction[]> {
    console.log(`[db] Getting mod actions for user: ${did}`);
    // TODO: Query molt_mod_actions WHERE subject_user_did = did
    return [];
  }
  
  /**
   * Get appeals for a mod action
   */
  async getAppeals(modActionUri: string): Promise<Appeal[]> {
    console.log(`[db] Getting appeals for: ${modActionUri}`);
    // TODO: Query molt_appeals WHERE subject_uri = modActionUri
    return [];
  }
  
  /**
   * Get testimonies for an appeal or mod action
   */
  async getTestimonies(subjectUri: string, options: {
    position?: string;
    limit?: number;
  } = {}): Promise<Testimony[]> {
    console.log(`[db] Getting testimonies for: ${subjectUri}`);
    // TODO: Query molt_testimonies
    // Handle anonymous testimonies - filter DID from response if anonymous=true
    return [];
  }
  
  /**
   * Get standing for a user in a context
   */
  async getStanding(subjectDid: string, contextUri: string): Promise<Standing | null> {
    console.log(`[db] Getting standing for ${subjectDid} in ${contextUri}`);
    // TODO: Query molt_standing
    return null;
  }
  
  /**
   * Get all users with standing in a context
   */
  async getStandingByContext(contextUri: string, options: {
    state?: string;
    limit?: number;
  } = {}): Promise<Standing[]> {
    console.log(`[db] Getting standing for context: ${contextUri}`);
    // TODO: Query molt_standing_by_context
    return [];
  }
  
  /**
   * Verify accountability for an actor
   * 
   * Checks if an actor has the required accountability fields set
   * (operatorDid, logicTrace) for agent actions
   */
  async verifyAccountability(did: string): Promise<{
    hasAccountability: boolean;
    operatorDid?: string;
    recentLogicTraces: number;
  }> {
    console.log(`[db] Verifying accountability for: ${did}`);
    // TODO: Check molt_posts for operatorDid and logicTrace presence
    // This is the binary gate - "has it or not"
    return {
      hasAccountability: false,
      recentLogicTraces: 0,
    };
  }
}

export const db = new Database();
