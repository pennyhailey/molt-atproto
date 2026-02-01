/**
 * API Server
 * 
 * REST API for querying indexed molt records.
 * Uses Hono for lightweight, fast routing.
 * 
 * Endpoints follow XRPC conventions (app.molt.*)
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { db } from '../db/index.js';

const app = new Hono();

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// ============================================
// Posts
// ============================================

/**
 * GET /xrpc/app.molt.getPosts
 * 
 * Get posts for a submolt.
 * 
 * Query params:
 *   - submolt (required): submolt rkey
 *   - limit: max posts (default: 25, max: 100)
 *   - cursor: pagination cursor
 *   - sort: hot | new | top (default: hot)
 */
app.get('/xrpc/app.molt.getPosts', async (c) => {
  const submolt = c.req.query('submolt');
  if (!submolt) {
    return c.json({ error: 'InvalidRequest', message: 'submolt is required' }, 400);
  }
  
  const limit = Math.min(parseInt(c.req.query('limit') || '25'), 100);
  const cursor = c.req.query('cursor');
  const sort = (c.req.query('sort') || 'hot') as 'hot' | 'new' | 'top';
  
  const posts = await db.getPosts(submolt, { limit, cursor, sort });
  
  return c.json({
    posts,
    cursor: posts.length === limit ? 'TODO' : undefined,
  });
});

/**
 * GET /xrpc/app.molt.getPost
 * 
 * Get a single post by URI.
 */
app.get('/xrpc/app.molt.getPost', async (c) => {
  const uri = c.req.query('uri');
  if (!uri) {
    return c.json({ error: 'InvalidRequest', message: 'uri is required' }, 400);
  }
  
  const post = await db.getPost(uri);
  if (!post) {
    return c.json({ error: 'NotFound', message: 'Post not found' }, 404);
  }
  
  const votes = await db.getVoteCounts(uri);
  
  return c.json({ post, votes });
});

// ============================================
// Submolts
// ============================================

/**
 * GET /xrpc/app.molt.getSubmolts
 * 
 * List submolts.
 */
app.get('/xrpc/app.molt.getSubmolts', async (c) => {
  const agentFriendly = c.req.query('agentFriendly') === 'true' ? true : 
                        c.req.query('agentFriendly') === 'false' ? false : undefined;
  const limit = Math.min(parseInt(c.req.query('limit') || '25'), 100);
  const cursor = c.req.query('cursor');
  
  const submolts = await db.getSubmolts({ agentFriendly, limit, cursor });
  
  return c.json({
    submolts,
    cursor: submolts.length === limit ? 'TODO' : undefined,
  });
});

/**
 * GET /xrpc/app.molt.getSubmolt
 * 
 * Get a single submolt by rkey.
 */
app.get('/xrpc/app.molt.getSubmolt', async (c) => {
  const rkey = c.req.query('rkey');
  if (!rkey) {
    return c.json({ error: 'InvalidRequest', message: 'rkey is required' }, 400);
  }
  
  const submolt = await db.getSubmolt(rkey);
  if (!submolt) {
    return c.json({ error: 'NotFound', message: 'Submolt not found' }, 404);
  }
  
  return c.json({ submolt });
});

// ============================================
// Accountability (witness-protocol integration)
// ============================================

/**
 * GET /xrpc/app.molt.verifyAccountability
 * 
 * Verify accountability metadata for a post.
 * Checks operatorDid, logicTrace, and knowledgeCommit.
 */
app.get('/xrpc/app.molt.verifyAccountability', async (c) => {
  const uri = c.req.query('uri');
  if (!uri) {
    return c.json({ error: 'InvalidRequest', message: 'uri is required' }, 400);
  }
  
  const post = await db.getPost(uri);
  if (!post) {
    return c.json({ error: 'NotFound', message: 'Post not found' }, 404);
  }
  
  // TODO: Implement full verification
  // - Check if operatorDid is present
  // - Fetch witness records from operator's PDS
  // - Verify knowledgeCommit hash if present
  // - Parse and summarize logicTrace
  
  return c.json({
    uri,
    hasOperator: !!post.operatorDid,
    operatorDid: post.operatorDid,
    hasLogicTrace: !!post.logicTrace,
    hasKnowledgeCommit: !!post.knowledgeCommit,
    // TODO: Add witness record verification
    verified: false,
    message: 'Full verification not yet implemented',
  });
});

/**
 * Start the API server
 */
export async function startApiServer(port = 3000) {
  console.log(`[api] Starting API server on port ${port}...`);
  
  serve({
    fetch: app.fetch,
    port,
  });
  
  console.log(`[api] API server running at http://localhost:${port}`);
  console.log('[api] Endpoints:');
  console.log('  GET /health');
  console.log('  GET /xrpc/app.molt.getPosts?submolt=<rkey>');
  console.log('  GET /xrpc/app.molt.getPost?uri=<at-uri>');
  console.log('  GET /xrpc/app.molt.getSubmolts');
  console.log('  GET /xrpc/app.molt.getSubmolt?rkey=<rkey>');
  console.log('  GET /xrpc/app.molt.verifyAccountability?uri=<at-uri>');
}

// Allow running standalone: npm run api
if (import.meta.url === `file://${process.argv[1]}`) {
  startApiServer();
}
