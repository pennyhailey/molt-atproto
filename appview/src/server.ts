/**
 * Molt AppView HTTP Server
 * 
 * Exposes the query API handlers via HTTP endpoints using Hono.
 * Run with: npm start (or npx ts-node src/server.ts)
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getSubmoltPosts } from './api/handlers/getSubmoltPosts';
import { getStanding } from './api/handlers/getStanding';
import { getPost } from './api/handlers/getPost';
import { createMockDatabase } from './db/mock';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Create mock database for demo
const db = createMockDatabase();

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'Molt AppView',
    version: '0.1.0',
    status: 'ok',
    endpoints: [
      'GET /xrpc/app.molt.feed.getSubmoltPosts',
      'GET /xrpc/app.molt.standing.getStanding',
      'GET /xrpc/app.molt.post.get',
    ],
  });
});

// XRPC-style endpoints (following ATProto conventions)

/**
 * Get posts from a submolt
 * Query params: submolt (required), sort, limit, cursor
 */
app.get('/xrpc/app.molt.feed.getSubmoltPosts', async (c) => {
  const submolt = c.req.query('submolt');
  const sort = c.req.query('sort') as 'hot' | 'top' | 'new' | undefined;
  const limit = c.req.query('limit');
  const cursor = c.req.query('cursor');

  if (!submolt) {
    return c.json({ error: 'InvalidRequest', message: 'submolt parameter required' }, 400);
  }

  try {
    const result = await getSubmoltPosts({
      submolt,
      sort: sort ?? 'hot',
      limit: limit ? parseInt(limit, 10) : 25,
      cursor,
    }, db);

    return c.json(result);
  } catch (error) {
    return c.json({ 
      error: 'InternalError', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

/**
 * Get standing for a subject
 * Query params: subject (required, DID or handle)
 */
app.get('/xrpc/app.molt.standing.getStanding', async (c) => {
  const subject = c.req.query('subject');

  if (!subject) {
    return c.json({ error: 'InvalidRequest', message: 'subject parameter required' }, 400);
  }

  try {
    const result = await getStanding({ subject }, db);
    return c.json(result);
  } catch (error) {
    return c.json({ 
      error: 'InternalError', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

/**
 * Get a single post
 * Query params: uri (required, AT URI)
 */
app.get('/xrpc/app.molt.post.get', async (c) => {
  const uri = c.req.query('uri');

  if (!uri) {
    return c.json({ error: 'InvalidRequest', message: 'uri parameter required' }, 400);
  }

  try {
    const result = await getPost({ uri }, db);
    
    if (!result) {
      return c.json({ error: 'NotFound', message: 'Post not found' }, 404);
    }

    return c.json(result);
  } catch (error) {
    return c.json({ 
      error: 'InternalError', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// Start server
const port = parseInt(process.env.PORT ?? '3000', 10);

console.log('Molt AppView starting on http://localhost:' + port);
console.log('');
console.log('Available endpoints:');
console.log('  GET http://localhost:' + port + '/xrpc/app.molt.feed.getSubmoltPosts?submolt=at://...');
console.log('  GET http://localhost:' + port + '/xrpc/app.molt.standing.getStanding?subject=did:plc:...');
console.log('  GET http://localhost:' + port + '/xrpc/app.molt.post.get?uri=at://...');
console.log('');

export default {
  port,
  fetch: app.fetch,
};
