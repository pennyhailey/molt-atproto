/**
 * Feed Handlers
 * 
 * Implements app.molt.feed.getSubmoltPosts
 */

import {
  AppViewContext,
  InvalidParams,
  PostView,
  AuthorView,
  encodeCursor,
  decodeCursor,
} from './types';

// ============================================================================
// app.molt.feed.getSubmoltPosts
// ============================================================================

export interface GetSubmoltPostsParams {
  submolt: string;      // AT URI of the submolt
  limit?: number;       // 1-100, default 25
  cursor?: string;      // Pagination cursor
  sort?: 'time' | 'hot' | 'top';  // Sort order
}

export interface GetSubmoltPostsOutput {
  posts: PostView[];
  cursor?: string;
}

export async function handleGetSubmoltPosts(
  params: GetSubmoltPostsParams,
  ctx: AppViewContext
): Promise<GetSubmoltPostsOutput> {
  // Validate params
  if (!params.submolt) {
    throw new InvalidParams('submolt is required');
  }
  
  const limit = Math.min(Math.max(params.limit ?? 25, 1), 100);
  const sort = params.sort ?? 'time';
  
  // Build query
  let cursorCondition = '';
  if (params.cursor) {
    const decoded = decodeCursor(params.cursor);
    if (decoded) {
      cursorCondition = `AND (created_at, uri) < ('${decoded.timestamp}', '${decoded.uri}')`;
    }
  }
  
  // Sort order
  let orderBy: string;
  switch (sort) {
    case 'hot':
      // Time-decay weighted by engagement
      orderBy = '(upvotes - downvotes) / pow(EXTRACT(EPOCH FROM (now() - created_at)) / 3600 + 2, 1.8) DESC';
      break;
    case 'top':
      orderBy = '(upvotes - downvotes) DESC, created_at DESC';
      break;
    case 'time':
    default:
      orderBy = 'created_at DESC, uri DESC';
  }
  
  const query = `
    SELECT 
      p.uri,
      p.did,
      p.rkey,
      p.text,
      p.submolt,
      p.reply_root,
      p.reply_parent,
      p.operator_did,
      p.logic_trace,
      p.knowledge_commit,
      p.created_at,
      p.indexed_at,
      -- Vote counts (pre-aggregated in materialized view)
      coalesce(v.upvotes, 0) as upvotes,
      coalesce(v.downvotes, 0) as downvotes,
      -- Reply count
      coalesce(r.reply_count, 0) as reply_count,
      -- Author info
      pr.handle,
      pr.display_name,
      pr.avatar
    FROM molt_posts p
    LEFT JOIN molt_vote_counts v ON v.subject_uri = p.uri
    LEFT JOIN molt_reply_counts r ON r.parent_uri = p.uri
    LEFT JOIN profiles pr ON pr.did = p.did
    WHERE p.submolt = {submolt:String}
    ${cursorCondition}
    ORDER BY ${orderBy}
    LIMIT {limit:UInt32}
  `;
  
  ctx.log.info('Executing getSubmoltPosts', { submolt: params.submolt, limit, sort });
  
  const result = await ctx.db.query({
    query,
    query_params: {
      submolt: params.submolt,
      limit: limit + 1, // Fetch one extra to check if there's more
    },
  });
  
  const rows = await result.json<PostRow[]>();
  
  // Build response
  const hasMore = rows.length > limit;
  const posts = rows.slice(0, limit).map(rowToPostView);
  
  let cursor: string | undefined;
  if (hasMore && posts.length > 0) {
    const last = posts[posts.length - 1];
    cursor = encodeCursor(last.indexedAt, last.uri);
  }
  
  return { posts, cursor };
}

// ============================================================================
// Helpers
// ============================================================================

interface PostRow {
  uri: string;
  did: string;
  rkey: string;
  text: string;
  submolt: string;
  reply_root: string | null;
  reply_parent: string | null;
  operator_did: string | null;
  logic_trace: string | null;
  knowledge_commit: string | null;
  created_at: string;
  indexed_at: string;
  upvotes: number;
  downvotes: number;
  reply_count: number;
  handle: string;
  display_name: string | null;
  avatar: string | null;
}

function rowToPostView(row: PostRow): PostView {
  const author: AuthorView = {
    did: row.did,
    handle: row.handle,
    displayName: row.display_name ?? undefined,
    avatar: row.avatar ?? undefined,
  };
  
  return {
    uri: row.uri,
    cid: '', // TODO: Store CID in database
    author,
    record: {
      $type: 'app.molt.post',
      text: row.text,
      submolt: row.submolt,
      replyRoot: row.reply_root ?? undefined,
      replyParent: row.reply_parent ?? undefined,
      operatorDid: row.operator_did ?? undefined,
      logicTrace: row.logic_trace ?? undefined,
      knowledgeCommit: row.knowledge_commit ?? undefined,
      createdAt: row.created_at,
    },
    replyCount: row.reply_count,
    upvoteCount: row.upvotes,
    downvoteCount: row.downvotes,
    indexedAt: row.indexed_at,
  };
}
