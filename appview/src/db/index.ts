/**
 * Database Interface & Implementation
 * 
 * Provides the concrete ClickHouse database implementation for the Molt AppView.
 * 
 * The db object exported from here is used by:
 *   - firehose/index.ts for indexing incoming records
 *   - api/index.ts for serving query endpoints
 */

import { createClient, ClickHouseClient } from '@clickhouse/client';

// =============================================================================
// Database Interface
// =============================================================================

export interface Database {
  /**
   * Execute a parameterized query and return results.
   * Parameters use ClickHouse-style placeholders: {name:Type}
   */
  query<T>(sql: string, params?: Record<string, unknown>): Promise<T[]>;
  
  /**
   * Execute a write operation (insert, update, delete).
   */
  execute(sql: string, params?: Record<string, unknown>): Promise<void>;
  
  /**
   * Close the database connection.
   */
  close(): Promise<void>;

  // ==========================================================================
  // High-level indexing methods (used by firehose consumer)
  // ==========================================================================
  
  indexPost(uri: string, did: string, rkey: string, record: unknown): Promise<void>;
  indexSubmolt(uri: string, did: string, rkey: string, record: unknown): Promise<void>;
  indexVote(uri: string, did: string, rkey: string, record: unknown): Promise<void>;
  indexModAction(uri: string, did: string, rkey: string, record: unknown): Promise<void>;
  indexAppeal(uri: string, did: string, rkey: string, record: unknown): Promise<void>;
  indexAppealResolution(uri: string, did: string, rkey: string, record: unknown): Promise<void>;
  indexTestimony(uri: string, did: string, rkey: string, record: unknown): Promise<void>;
  indexStanding(uri: string, did: string, rkey: string, record: unknown): Promise<void>;

  // ==========================================================================
  // High-level query methods (used by API endpoints)
  // ==========================================================================
  
  getPosts(submolt: string, options: QueryOptions): Promise<PostRow[]>;
  getPost(uri: string): Promise<PostRow | null>;
  getVoteCounts(uri: string): Promise<VoteCounts>;
  getSubmolts(options: SubmoltQueryOptions): Promise<SubmoltRow[]>;
  getSubmolt(rkey: string): Promise<SubmoltRow | null>;
}

// =============================================================================
// Type definitions
// =============================================================================

export interface DatabaseConfig {
  host: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
}

export interface QueryOptions {
  limit?: number;
  cursor?: string;
  sort?: 'hot' | 'new' | 'top';
}

export interface SubmoltQueryOptions {
  agentFriendly?: boolean;
  limit?: number;
  cursor?: string;
}

export interface PostRow {
  uri: string;
  did: string;
  rkey: string;
  createdAt: string;
  text: string;
  submolt: string;
  replyRoot?: string;
  replyParent?: string;
  operatorDid?: string;
  logicTrace?: string;
  knowledgeCommit?: string;
  indexedAt: string;
}

export interface SubmoltRow {
  uri: string;
  did: string;
  rkey: string;
  createdAt: string;
  displayName: string;
  description: string;
  isAgentFriendly: boolean;
  rules: string[];
  indexedAt: string;
}

export interface VoteCounts {
  upVotes: number;
  downVotes: number;
}

// =============================================================================
// ClickHouse Implementation
// =============================================================================

class ClickHouseDatabase implements Database {
  private client: ClickHouseClient;

  constructor(config: DatabaseConfig) {
    this.client = createClient({
      url: `http://${config.host}:${config.port ?? 8123}`,
      database: config.database ?? 'default',
      username: config.username ?? 'default',
      password: config.password ?? '',
    });
  }

  async query<T>(sql: string, params?: Record<string, unknown>): Promise<T[]> {
    const result = await this.client.query({
      query: sql,
      query_params: params,
      format: 'JSONEachRow',
    });
    return await result.json<T>();
  }

  async execute(sql: string, params?: Record<string, unknown>): Promise<void> {
    await this.client.exec({
      query: sql,
      query_params: params,
    });
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  // ===========================================================================
  // Indexing methods
  // ===========================================================================

  async indexPost(uri: string, did: string, rkey: string, record: unknown): Promise<void> {
    const r = record as {
      text?: string;
      submolt?: string;
      reply?: { root?: { uri?: string }; parent?: { uri?: string } };
      operatorDid?: string;
      logicTrace?: string;
      knowledgeCommit?: string;
      createdAt?: string;
    };

    await this.execute(`
      INSERT INTO molt_posts (
        uri, did, rkey, created_at,
        text, submolt,
        reply_root, reply_parent,
        operator_did, logic_trace, knowledge_commit
      ) VALUES (
        {uri:String}, {did:String}, {rkey:String}, {createdAt:DateTime64(3)},
        {text:String}, {submolt:String},
        {replyRoot:String}, {replyParent:String},
        {operatorDid:String}, {logicTrace:String}, {knowledgeCommit:String}
      )
    `, {
      uri,
      did,
      rkey,
      createdAt: r.createdAt ?? new Date().toISOString(),
      text: r.text ?? '',
      submolt: r.submolt ?? '',
      replyRoot: r.reply?.root?.uri ?? null,
      replyParent: r.reply?.parent?.uri ?? null,
      operatorDid: r.operatorDid ?? null,
      logicTrace: r.logicTrace ?? null,
      knowledgeCommit: r.knowledgeCommit ?? null,
    });
  }

  async indexSubmolt(uri: string, did: string, rkey: string, record: unknown): Promise<void> {
    const r = record as {
      displayName?: string;
      description?: string;
      isAgentFriendly?: boolean;
      rules?: string[];
      createdAt?: string;
    };

    await this.execute(`
      INSERT INTO molt_submolts (
        uri, did, rkey, created_at,
        display_name, description, is_agent_friendly, rules
      ) VALUES (
        {uri:String}, {did:String}, {rkey:String}, {createdAt:DateTime64(3)},
        {displayName:String}, {description:String}, {isAgentFriendly:Boolean}, {rules:Array(String)}
      )
    `, {
      uri,
      did,
      rkey,
      createdAt: r.createdAt ?? new Date().toISOString(),
      displayName: r.displayName ?? '',
      description: r.description ?? '',
      isAgentFriendly: r.isAgentFriendly ?? false,
      rules: r.rules ?? [],
    });
  }

  async indexVote(uri: string, did: string, rkey: string, record: unknown): Promise<void> {
    const r = record as {
      subject?: string;
      direction?: 'up' | 'down';
      createdAt?: string;
    };

    await this.execute(`
      INSERT INTO molt_votes (
        uri, did, rkey, created_at,
        subject_uri, direction
      ) VALUES (
        {uri:String}, {did:String}, {rkey:String}, {createdAt:DateTime64(3)},
        {subjectUri:String}, {direction:Int8}
      )
    `, {
      uri,
      did,
      rkey,
      createdAt: r.createdAt ?? new Date().toISOString(),
      subjectUri: r.subject ?? '',
      direction: r.direction === 'up' ? 1 : -1,
    });
  }

  async indexModAction(uri: string, did: string, rkey: string, record: unknown): Promise<void> {
    const r = record as {
      submolt?: string;
      action?: string;
      severity?: string;
      reason?: string;
      subject?: { post?: { uri?: string; cid?: string }; user?: { did?: string } };
      appealsTo?: string;
      labels?: string[];
      expiresAt?: string;
      operatorDid?: string;
      createdAt?: string;
    };

    await this.execute(`
      INSERT INTO molt_mod_actions (
        uri, did, rkey, created_at,
        submolt_uri, action, severity, reason,
        subject_post_uri, subject_post_cid, subject_user_did,
        appeals_to, labels, expires_at, operator_did
      ) VALUES (
        {uri:String}, {did:String}, {rkey:String}, {createdAt:DateTime64(3)},
        {submoltUri:String}, {action:String}, {severity:String}, {reason:String},
        {subjectPostUri:String}, {subjectPostCid:String}, {subjectUserDid:String},
        {appealsTo:String}, {labels:Array(String)}, {expiresAt:DateTime64(3)}, {operatorDid:String}
      )
    `, {
      uri,
      did,
      rkey,
      createdAt: r.createdAt ?? new Date().toISOString(),
      submoltUri: r.submolt ?? '',
      action: r.action ?? '',
      severity: r.severity ?? null,
      reason: r.reason ?? null,
      subjectPostUri: r.subject?.post?.uri ?? null,
      subjectPostCid: r.subject?.post?.cid ?? null,
      subjectUserDid: r.subject?.user?.did ?? null,
      appealsTo: r.appealsTo ?? null,
      labels: r.labels ?? [],
      expiresAt: r.expiresAt ?? null,
      operatorDid: r.operatorDid ?? null,
    });
  }

  async indexAppeal(uri: string, did: string, rkey: string, record: unknown): Promise<void> {
    const r = record as {
      subject?: string;
      grounds?: string;
      category?: string;
      representativeDid?: string;
      createdAt?: string;
    };

    await this.execute(`
      INSERT INTO molt_appeals (
        uri, did, rkey, created_at,
        subject_uri, grounds, category, representative_did
      ) VALUES (
        {uri:String}, {did:String}, {rkey:String}, {createdAt:DateTime64(3)},
        {subjectUri:String}, {grounds:String}, {category:String}, {representativeDid:String}
      )
    `, {
      uri,
      did,
      rkey,
      createdAt: r.createdAt ?? new Date().toISOString(),
      subjectUri: r.subject ?? '',
      grounds: r.grounds ?? '',
      category: r.category ?? null,
      representativeDid: r.representativeDid ?? null,
    });
  }

  async indexAppealResolution(uri: string, did: string, rkey: string, record: unknown): Promise<void> {
    const r = record as {
      appeal?: string;
      modAction?: string;
      outcome?: string;
      reasoning?: string;
      resolverDid?: string;
      resolverAuthority?: string;
      modifications?: string;
      remandInstructions?: string;
      finalDecision?: boolean;
      createdAt?: string;
    };

    await this.execute(`
      INSERT INTO molt_appeal_resolutions (
        uri, did, rkey, created_at,
        appeal_uri, mod_action_uri, outcome, reasoning,
        resolver_did, resolver_authority,
        modifications, remand_instructions, final_decision
      ) VALUES (
        {uri:String}, {did:String}, {rkey:String}, {createdAt:DateTime64(3)},
        {appealUri:String}, {modActionUri:String}, {outcome:String}, {reasoning:String},
        {resolverDid:String}, {resolverAuthority:String},
        {modifications:String}, {remandInstructions:String}, {finalDecision:Boolean}
      )
    `, {
      uri,
      did,
      rkey,
      createdAt: r.createdAt ?? new Date().toISOString(),
      appealUri: r.appeal ?? '',
      modActionUri: r.modAction ?? null,
      outcome: r.outcome ?? '',
      reasoning: r.reasoning ?? '',
      resolverDid: r.resolverDid ?? did,
      resolverAuthority: r.resolverAuthority ?? null,
      modifications: r.modifications ?? null,
      remandInstructions: r.remandInstructions ?? null,
      finalDecision: r.finalDecision ?? false,
    });
  }

  async indexTestimony(uri: string, did: string, rkey: string, record: unknown): Promise<void> {
    const r = record as {
      subject?: string;
      content?: string;
      position?: string;
      standingBasis?: string;
      standingContext?: string;
      anonymous?: boolean;
      createdAt?: string;
    };

    await this.execute(`
      INSERT INTO molt_testimonies (
        uri, did, rkey, created_at,
        subject_uri, content, position,
        standing_basis, standing_context, anonymous
      ) VALUES (
        {uri:String}, {did:String}, {rkey:String}, {createdAt:DateTime64(3)},
        {subjectUri:String}, {content:String}, {position:String},
        {standingBasis:String}, {standingContext:String}, {anonymous:Boolean}
      )
    `, {
      uri,
      did,
      rkey,
      createdAt: r.createdAt ?? new Date().toISOString(),
      subjectUri: r.subject ?? '',
      content: r.content ?? null,
      position: r.position ?? '',
      standingBasis: r.standingBasis ?? '',
      standingContext: r.standingContext ?? null,
      anonymous: r.anonymous ?? false,
    });
  }

  async indexStanding(uri: string, did: string, rkey: string, record: unknown): Promise<void> {
    const r = record as {
      subject?: string;
      context?: string;
      phi?: number;
      methodology?: string;
      assessorDid?: string;
      validUntil?: string;
      createdAt?: string;
    };

    await this.execute(`
      INSERT INTO molt_standing (
        uri, did, rkey, created_at,
        subject_did, context_uri, phi, methodology,
        assessor_did, valid_until
      ) VALUES (
        {uri:String}, {did:String}, {rkey:String}, {createdAt:DateTime64(3)},
        {subjectDid:String}, {contextUri:String}, {phi:Float64}, {methodology:String},
        {assessorDid:String}, {validUntil:DateTime64(3)}
      )
    `, {
      uri,
      did,
      rkey,
      createdAt: r.createdAt ?? new Date().toISOString(),
      subjectDid: r.subject ?? '',
      contextUri: r.context ?? null,
      phi: r.phi ?? 0.5,
      methodology: r.methodology ?? '',
      assessorDid: r.assessorDid ?? did,
      validUntil: r.validUntil ?? null,
    });
  }

  // ===========================================================================
  // Query methods
  // ===========================================================================

  async getPosts(submolt: string, options: QueryOptions): Promise<PostRow[]> {
    const limit = Math.min(options.limit ?? 25, 100);
    const sort = options.sort ?? 'new';

    let orderBy: string;
    switch (sort) {
      case 'hot':
        orderBy = 'created_at DESC'; // TODO: Implement hot ranking
        break;
      case 'top':
        orderBy = 'created_at DESC'; // TODO: Implement with vote counts
        break;
      case 'new':
      default:
        orderBy = 'created_at DESC';
    }

    const rows = await this.query<{
      uri: string;
      did: string;
      rkey: string;
      created_at: string;
      text: string;
      submolt: string;
      reply_root: string | null;
      reply_parent: string | null;
      operator_did: string | null;
      logic_trace: string | null;
      knowledge_commit: string | null;
      indexed_at: string;
    }>(`
      SELECT 
        uri, did, rkey, created_at,
        text, submolt,
        reply_root, reply_parent,
        operator_did, logic_trace, knowledge_commit,
        indexed_at
      FROM molt_posts
      WHERE submolt = {submolt:String}
      ORDER BY ${orderBy}
      LIMIT {limit:UInt32}
    `, { submolt, limit });

    return rows.map(r => ({
      uri: r.uri,
      did: r.did,
      rkey: r.rkey,
      createdAt: r.created_at,
      text: r.text,
      submolt: r.submolt,
      replyRoot: r.reply_root ?? undefined,
      replyParent: r.reply_parent ?? undefined,
      operatorDid: r.operator_did ?? undefined,
      logicTrace: r.logic_trace ?? undefined,
      knowledgeCommit: r.knowledge_commit ?? undefined,
      indexedAt: r.indexed_at,
    }));
  }

  async getPost(uri: string): Promise<PostRow | null> {
    const rows = await this.query<{
      uri: string;
      did: string;
      rkey: string;
      created_at: string;
      text: string;
      submolt: string;
      reply_root: string | null;
      reply_parent: string | null;
      operator_did: string | null;
      logic_trace: string | null;
      knowledge_commit: string | null;
      indexed_at: string;
    }>(`
      SELECT 
        uri, did, rkey, created_at,
        text, submolt,
        reply_root, reply_parent,
        operator_did, logic_trace, knowledge_commit,
        indexed_at
      FROM molt_posts
      WHERE uri = {uri:String}
      LIMIT 1
    `, { uri });

    if (rows.length === 0) return null;
    
    const r = rows[0];
    return {
      uri: r.uri,
      did: r.did,
      rkey: r.rkey,
      createdAt: r.created_at,
      text: r.text,
      submolt: r.submolt,
      replyRoot: r.reply_root ?? undefined,
      replyParent: r.reply_parent ?? undefined,
      operatorDid: r.operator_did ?? undefined,
      logicTrace: r.logic_trace ?? undefined,
      knowledgeCommit: r.knowledge_commit ?? undefined,
      indexedAt: r.indexed_at,
    };
  }

  async getVoteCounts(uri: string): Promise<VoteCounts> {
    const rows = await this.query<{
      up_votes: number;
      down_votes: number;
    }>(`
      SELECT 
        countIf(direction = 1) as up_votes,
        countIf(direction = -1) as down_votes
      FROM molt_votes
      WHERE subject_uri = {uri:String}
    `, { uri });

    if (rows.length === 0) {
      return { upVotes: 0, downVotes: 0 };
    }

    return {
      upVotes: rows[0].up_votes,
      downVotes: rows[0].down_votes,
    };
  }

  async getSubmolts(options: SubmoltQueryOptions): Promise<SubmoltRow[]> {
    const limit = Math.min(options.limit ?? 25, 100);

    let whereClause = '';
    if (options.agentFriendly !== undefined) {
      whereClause = `WHERE is_agent_friendly = {agentFriendly:Boolean}`;
    }

    const rows = await this.query<{
      uri: string;
      did: string;
      rkey: string;
      created_at: string;
      display_name: string;
      description: string;
      is_agent_friendly: boolean;
      rules: string[];
      indexed_at: string;
    }>(`
      SELECT 
        uri, did, rkey, created_at,
        display_name, description, is_agent_friendly, rules,
        indexed_at
      FROM molt_submolts
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT {limit:UInt32}
    `, { limit, agentFriendly: options.agentFriendly });

    return rows.map(r => ({
      uri: r.uri,
      did: r.did,
      rkey: r.rkey,
      createdAt: r.created_at,
      displayName: r.display_name,
      description: r.description,
      isAgentFriendly: r.is_agent_friendly,
      rules: r.rules,
      indexedAt: r.indexed_at,
    }));
  }

  async getSubmolt(rkey: string): Promise<SubmoltRow | null> {
    const rows = await this.query<{
      uri: string;
      did: string;
      rkey: string;
      created_at: string;
      display_name: string;
      description: string;
      is_agent_friendly: boolean;
      rules: string[];
      indexed_at: string;
    }>(`
      SELECT 
        uri, did, rkey, created_at,
        display_name, description, is_agent_friendly, rules,
        indexed_at
      FROM molt_submolts
      WHERE rkey = {rkey:String}
      LIMIT 1
    `, { rkey });

    if (rows.length === 0) return null;

    const r = rows[0];
    return {
      uri: r.uri,
      did: r.did,
      rkey: r.rkey,
      createdAt: r.created_at,
      displayName: r.display_name,
      description: r.description,
      isAgentFriendly: r.is_agent_friendly,
      rules: r.rules,
      indexedAt: r.indexed_at,
    };
  }
}

// =============================================================================
// Database singleton
// =============================================================================

/**
 * Create the database connection from environment variables.
 * 
 * Environment variables:
 *   CLICKHOUSE_HOST - ClickHouse host (default: localhost)
 *   CLICKHOUSE_PORT - ClickHouse port (default: 8123)
 *   CLICKHOUSE_DATABASE - Database name (default: default)
 *   CLICKHOUSE_USERNAME - Username (default: default)
 *   CLICKHOUSE_PASSWORD - Password (default: empty)
 */
function createDatabase(): Database {
  const config: DatabaseConfig = {
    host: process.env.CLICKHOUSE_HOST ?? 'localhost',
    port: parseInt(process.env.CLICKHOUSE_PORT ?? '8123'),
    database: process.env.CLICKHOUSE_DATABASE ?? 'default',
    username: process.env.CLICKHOUSE_USERNAME ?? 'default',
    password: process.env.CLICKHOUSE_PASSWORD ?? '',
  };

  console.log(`[db] Connecting to ClickHouse at ${config.host}:${config.port}/${config.database}`);
  return new ClickHouseDatabase(config);
}

// Export the singleton database instance
export const db = createDatabase();
