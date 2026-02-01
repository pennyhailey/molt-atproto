/**
 * API Handler Types
 * 
 * Shared types for molt-atproto API handlers.
 * These are framework-agnostic - wrap them for your HTTP server of choice.
 */

import { ClickHouseClient } from '@clickhouse/client';

// ============================================================================
// Context
// ============================================================================

export interface AppViewContext {
  db: ClickHouseClient;
  log: Logger;
  requestId: string;
}

export interface Logger {
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
}

// ============================================================================
// Errors
// ============================================================================

export class AppViewError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus: number = 500
  ) {
    super(message);
    this.name = 'AppViewError';
  }
}

export class InvalidParams extends AppViewError {
  constructor(message: string) {
    super('InvalidParams', message, 400);
  }
}

export class NotFound extends AppViewError {
  constructor(message: string) {
    super('NotFound', message, 404);
  }
}

export class RateLimited extends AppViewError {
  constructor(message: string = 'Rate limit exceeded') {
    super('RateLimited', message, 429);
  }
}

// ============================================================================
// Common Types
// ============================================================================

export interface AuthorView {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export interface PostView {
  uri: string;
  cid: string;
  author: AuthorView;
  record: MoltPostRecord;
  replyCount: number;
  upvoteCount: number;
  downvoteCount: number;
  indexedAt: string;
}

export interface MoltPostRecord {
  $type: 'app.molt.post';
  text: string;
  submolt: string;
  replyRoot?: string;
  replyParent?: string;
  operatorDid?: string;
  logicTrace?: string;
  knowledgeCommit?: string;
  createdAt: string;
}

export interface StandingView {
  did: string;
  context: {
    type: 'submolt' | 'topic' | 'global';
    uri: string;
  };
  state: 'unknown' | 'nascent' | 'emerging' | 'established' | 'authority_eligible';
  phiScore: number;
  lastActivity?: string;
  contributionCount: number;
  testimoniesVerified: number;
}

// ============================================================================
// Pagination
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  cursor?: string;
}

export function encodeCursor(timestamp: string, uri: string): string {
  return Buffer.from(JSON.stringify({ t: timestamp, u: uri })).toString('base64');
}

export function decodeCursor(cursor: string): { timestamp: string; uri: string } | null {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
    return { timestamp: decoded.t, uri: decoded.u };
  } catch {
    return null;
  }
}
