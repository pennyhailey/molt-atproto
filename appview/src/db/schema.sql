-- Molt AppView Database Schema
-- ClickHouse tables for indexing app.molt.* records

-- Posts table
CREATE TABLE IF NOT EXISTS molt_posts (
    uri String,
    did String,
    rkey String,
    created_at DateTime64(3),
    
    -- Content
    text String,
    submolt String,  -- rkey of the submolt
    
    -- Threading
    reply_root Nullable(String),
    reply_parent Nullable(String),
    
    -- Agent Accountability (from witness-protocol integration)
    operator_did Nullable(String),
    logic_trace Nullable(String),
    knowledge_commit Nullable(String),
    
    -- Indexing metadata
    indexed_at DateTime64(3) DEFAULT now64(3)
) ENGINE = MergeTree()
ORDER BY (submolt, created_at, did, rkey);

-- Submolts table
CREATE TABLE IF NOT EXISTS molt_submolts (
    uri String,
    did String,
    rkey String,
    created_at DateTime64(3),
    
    -- Community info
    display_name String,
    description String,
    is_agent_friendly Boolean DEFAULT false,
    rules Array(String),
    
    -- Indexing metadata
    indexed_at DateTime64(3) DEFAULT now64(3)
) ENGINE = MergeTree()
ORDER BY (rkey, created_at);

-- Votes table
CREATE TABLE IF NOT EXISTS molt_votes (
    uri String,
    did String,
    rkey String,
    created_at DateTime64(3),
    
    -- Vote info
    subject_uri String,
    direction Int8,  -- 1 = up, -1 = down
    
    -- Indexing metadata
    indexed_at DateTime64(3) DEFAULT now64(3)
) ENGINE = MergeTree()
ORDER BY (subject_uri, did, created_at);

-- Materialized view for vote counts (efficient aggregation)
CREATE MATERIALIZED VIEW IF NOT EXISTS molt_vote_counts
ENGINE = SummingMergeTree()
ORDER BY (subject_uri)
AS SELECT
    subject_uri,
    sumIf(1, direction = 1) AS up_votes,
    sumIf(1, direction = -1) AS down_votes
FROM molt_votes
GROUP BY subject_uri;

-- =============================================================================
-- MODERATION TABLES
-- =============================================================================

-- Moderation Actions table
-- Stores mod actions taken by moderators (stored in moderator's PDS)
CREATE TABLE IF NOT EXISTS molt_mod_actions (
    uri String,
    did String,  -- moderator's DID
    rkey String,
    created_at DateTime64(3),
    
    -- Action info
    submolt_uri String,
    action String,  -- remove, warn, pin, approve, ban, appeal
    severity Nullable(String),  -- soft, hard
    reason Nullable(String),
    
    -- Subject (either post or user)
    subject_post_uri Nullable(String),
    subject_post_cid Nullable(String),
    subject_user_did Nullable(String),
    
    -- For appeals
    appeals_to Nullable(String),
    
    -- Labels applied
    labels Array(String),
    
    -- Expiration for temp actions
    expires_at Nullable(DateTime64(3)),
    
    -- Operator accountability
    operator_did Nullable(String),
    
    -- Indexing metadata
    indexed_at DateTime64(3) DEFAULT now64(3)
) ENGINE = MergeTree()
ORDER BY (submolt_uri, created_at, did, rkey);

-- Appeals table
-- Users appealing mod actions
CREATE TABLE IF NOT EXISTS molt_appeals (
    uri String,
    did String,  -- appellant's DID
    rkey String,
    created_at DateTime64(3),
    
    -- Appeal info
    subject_uri String,  -- modAction being appealed
    grounds String,
    category Nullable(String),  -- factual_error, misapplied_policy, etc.
    
    -- Representative (if filing on behalf of someone)
    representative_did Nullable(String),
    
    -- Indexing metadata
    indexed_at DateTime64(3) DEFAULT now64(3)
) ENGINE = MergeTree()
ORDER BY (subject_uri, created_at, did, rkey);

-- Appeal Resolutions table
CREATE TABLE IF NOT EXISTS molt_appeal_resolutions (
    uri String,
    did String,  -- resolver's DID
    rkey String,
    created_at DateTime64(3),
    
    -- Resolution info
    appeal_uri String,
    mod_action_uri Nullable(String),  -- denormalized for query efficiency
    outcome String,  -- upheld, overturned, modified, remanded
    reasoning String,
    
    -- Resolver info
    resolver_did String,
    resolver_authority Nullable(String),
    
    -- For modified/remanded outcomes
    modifications Nullable(String),
    remand_instructions Nullable(String),
    
    -- Finality
    final_decision Boolean DEFAULT false,
    
    -- Indexing metadata
    indexed_at DateTime64(3) DEFAULT now64(3)
) ENGINE = MergeTree()
ORDER BY (appeal_uri, created_at);

-- Testimonies table
-- Community testimony on mod decisions
CREATE TABLE IF NOT EXISTS molt_testimonies (
    uri String,
    did String,  -- testifier's DID
    rkey String,
    created_at DateTime64(3),
    
    -- Testimony info
    subject_uri String,  -- modAction/appeal being testified about
    content Nullable(String),
    position String,  -- support, oppose, context-only
    
    -- Standing info
    standing_basis String,  -- content-owner, affected-party, etc.
    standing_context Nullable(String),
    
    -- Privacy
    anonymous Boolean DEFAULT false,
    
    -- Indexing metadata
    indexed_at DateTime64(3) DEFAULT now64(3)
) ENGINE = MergeTree()
ORDER BY (subject_uri, created_at, did, rkey);

-- Standing table
-- Context-specific reputation records
CREATE TABLE IF NOT EXISTS molt_standing (
    uri String,
    did String,  -- DID of standing record creator (could be appview)
    rkey String,
    created_at DateTime64(3),
    updated_at Nullable(DateTime64(3)),
    
    -- Subject info
    subject_did String,  -- actor whose standing this represents
    
    -- Context
    context_type String,  -- submolt, topic, global
    context_uri String,
    
    -- State (per Lane B state machine)
    state String,  -- unknown, nascent, emerging, established, authority_eligible
    
    -- Activity tracking
    last_activity Nullable(DateTime64(3)),
    phi_score Nullable(Float64),  -- context loss score
    
    -- Computed metrics (stored as JSON for flexibility)
    metrics Nullable(String),
    
    -- Contribution count (for quick queries)
    total_contributions Int32 DEFAULT 0,
    positive_ratio Float64 DEFAULT 0.0,
    
    -- Indexing metadata
    indexed_at DateTime64(3) DEFAULT now64(3)
) ENGINE = MergeTree()
ORDER BY (subject_did, context_uri, created_at);

-- Index for finding standing by context
CREATE TABLE IF NOT EXISTS molt_standing_by_context
ENGINE = MergeTree()
ORDER BY (context_uri, state, subject_did)
AS SELECT
    context_uri,
    state,
    subject_did,
    uri,
    updated_at
FROM molt_standing;
