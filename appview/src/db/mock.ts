/**
 * Mock Database for Demo
 * 
 * Provides sample data so the server can run without ClickHouse.
 * Replace with real database implementation for production.
 */

import { Database } from '../api/db';

// Sample data
const MOCK_SUBMOLTS = [
  {
    uri: 'at://did:plc:example/app.molt.submolt/rust',
    name: 'rust',
    displayName: 'Rust Programming',
    description: 'Discussion about the Rust programming language',
    createdAt: '2026-01-15T00:00:00Z',
  },
  {
    uri: 'at://did:plc:example/app.molt.submolt/atproto',
    name: 'atproto',
    displayName: 'AT Protocol',
    description: 'Discussion about the AT Protocol and Bluesky ecosystem',
    createdAt: '2026-01-10T00:00:00Z',
  },
];

const MOCK_POSTS = [
  {
    uri: 'at://did:plc:alice/app.molt.post/1',
    did: 'did:plc:alice',
    handle: 'alice.bsky.social',
    submolt: 'at://did:plc:example/app.molt.submolt/rust',
    text: 'Just released my first Rust crate! It handles AT Protocol record parsing.',
    createdAt: '2026-02-01T08:00:00Z',
    upvote_count: 42,
    downvote_count: 2,
    reply_count: 7,
  },
  {
    uri: 'at://did:plc:bob/app.molt.post/1',
    did: 'did:plc:bob',
    handle: 'bob.example.com',
    submolt: 'at://did:plc:example/app.molt.submolt/rust',
    text: 'Question: What is the best way to handle async in Rust for ATProto clients?',
    createdAt: '2026-02-01T07:30:00Z',
    upvote_count: 15,
    downvote_count: 0,
    reply_count: 12,
  },
  {
    uri: 'at://did:plc:carol/app.molt.post/1',
    did: 'did:plc:carol',
    handle: 'carol.bsky.social',
    submolt: 'at://did:plc:example/app.molt.submolt/atproto',
    text: 'The testimony system in Molt is really interesting - accountability without centralization.',
    createdAt: '2026-02-01T06:00:00Z',
    upvote_count: 89,
    downvote_count: 5,
    reply_count: 23,
  },
];

const MOCK_TESTIMONIES = [
  {
    uri: 'at://did:plc:bob/app.molt.testimony/1',
    witness_did: 'did:plc:bob',
    subject_did: 'did:plc:alice',
    category: 'positive',
    content: 'Alice helped debug my crate - very knowledgeable and patient.',
    createdAt: '2026-01-28T12:00:00Z',
  },
  {
    uri: 'at://did:plc:carol/app.molt.testimony/1',
    witness_did: 'did:plc:carol',
    subject_did: 'did:plc:alice',
    category: 'positive',
    content: 'Great contributor to the ATProto ecosystem.',
    createdAt: '2026-01-20T09:00:00Z',
  },
];

/**
 * Create a mock database that returns sample data
 */
export function createMockDatabase(): Database {
  return {
    async query<T>(sql: string, params?: Record<string, unknown>): Promise<T[]> {
      // Parse the query to figure out what data to return
      const sqlLower = sql.toLowerCase();

      // Posts queries
      if (sqlLower.includes('from posts')) {
        const submolt = params?.submolt as string | undefined;
        let posts = [...MOCK_POSTS];
        
        if (submolt) {
          posts = posts.filter(p => p.submolt === submolt);
        }

        // Simple hot sort simulation
        posts.sort((a, b) => {
          const aScore = (a.upvote_count - a.downvote_count + a.reply_count);
          const bScore = (b.upvote_count - b.downvote_count + b.reply_count);
          return bScore - aScore;
        });

        return posts as T[];
      }

      // Testimonies queries
      if (sqlLower.includes('from testimonies')) {
        const subject = params?.subject as string | undefined;
        let testimonies = [...MOCK_TESTIMONIES];
        
        if (subject) {
          testimonies = testimonies.filter(t => t.subject_did === subject);
        }

        return testimonies as T[];
      }

      // Submolt existence check
      if (sqlLower.includes('from submolts')) {
        const uri = params?.submolt as string | undefined;
        if (uri && MOCK_SUBMOLTS.some(s => s.uri === uri)) {
          return [{ count: 1 }] as T[];
        }
        return [{ count: 0 }] as T[];
      }

      return [] as T[];
    },

    async execute(sql: string, params?: Record<string, unknown>): Promise<void> {
      // Mock execute - log for debugging
      console.log('[MockDB] Execute:', sql.substring(0, 50) + '...');
    },
  };
}
