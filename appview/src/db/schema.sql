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

-- Moderation Actions table (TODO: implement after core is working)
-- CREATE TABLE IF NOT EXISTS molt_mod_actions ( ... );

-- Testimonies table (TODO: implement after core is working)
-- CREATE TABLE IF NOT EXISTS molt_testimonies ( ... );

-- Standing table (TODO: implement after core is working)
-- CREATE TABLE IF NOT EXISTS molt_standing ( ... );
