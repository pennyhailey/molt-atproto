/**
 * API Handler: app.molt.feed.getSubmoltPosts
 * 
 * Get posts from a submolt, sorted by time or engagement.
 */

import { Database } from '../db';

interface GetSubmoltPostsParams {
  submolt: string;  // AT URI of submolt
  limit?: number;   // default 25, max 100
  cursor?: string;
  sort?: 'time' | 'hot' | 'top';
}

interface AuthorView {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

interface PostView {
  uri: string;
  cid: string;
  author: AuthorView;
  record: unknown;
  replyCount: number;
  upvoteCount: number;
  downvoteCount: number;
  indexedAt: string;
}

interface GetSubmoltPostsResponse {
  posts: PostView[];
  cursor?: string;
}

export async function getSubmoltPosts(
  params: GetSubmoltPostsParams,
  db: Database
): Promise<GetSubmoltPostsResponse> {
  const limit = Math.min(params.limit ?? 25, 100);
  const sort = params.sort ?? 'time';
  
  // Parse cursor for pagination
  let cursorTimestamp: Date | undefined;
  if (params.cursor) {
    try {
      cursorTimestamp = new Date(Buffer.from(params.cursor, 'base64').toString());
    } catch {
      // Invalid cursor, ignore
    }
  }

  // Build sort clause
  let orderBy: string;
  switch (sort) {
    case 'hot':
      // Hot = engagement weighted by recency
      // Simple formula: (upvotes - downvotes + replies) / (hours_since_post + 2)^1.5
      orderBy = `
        (upvote_count - downvote_count + reply_count) / 
        pow(dateDiff('hour', created_at, now()) + 2, 1.5) DESC
      `;
      break;
    case 'top':
      orderBy = '(upvote_count - downvote_count) DESC';
      break;
    case 'time':
    default:
      orderBy = 'indexed_at DESC';
  }

  // Query posts
  const posts = await db.query<{
    uri: string;
    cid: string;
    did: string;
    handle: string;
    display_name: string | null;
    avatar: string | null;
    record: string;
    reply_count: number;
    upvote_count: number;
    downvote_count: number;
    indexed_at: string;
  }>(`
    SELECT 
      p.uri,
      p.cid,
      p.did,
      pr.handle,
      pr.display_name,
      pr.avatar,
      p.record,
      p.reply_count,
      p.upvote_count,
      p.downvote_count,
      p.indexed_at
    FROM posts p
    LEFT JOIN profiles pr ON p.did = pr.did
    WHERE p.submolt = {submolt:String}
      ${cursorTimestamp ? 'AND p.indexed_at < {cursor:DateTime}' : ''}
    ORDER BY ${orderBy}
    LIMIT {limit:UInt32}
  `, {
    submolt: params.submolt,
    limit: limit + 1, // Fetch one extra to determine if there's a next page
    ...(cursorTimestamp && { cursor: cursorTimestamp })
  });

  // Check if there's a next page
  const hasMore = posts.length > limit;
  const resultPosts = hasMore ? posts.slice(0, limit) : posts;

  // Build cursor for next page
  let nextCursor: string | undefined;
  if (hasMore && resultPosts.length > 0) {
    const lastPost = resultPosts[resultPosts.length - 1];
    nextCursor = Buffer.from(lastPost.indexed_at).toString('base64');
  }

  return {
    posts: resultPosts.map(p => ({
      uri: p.uri,
      cid: p.cid,
      author: {
        did: p.did,
        handle: p.handle,
        displayName: p.display_name ?? undefined,
        avatar: p.avatar ?? undefined,
      },
      record: JSON.parse(p.record),
      replyCount: p.reply_count,
      upvoteCount: p.upvote_count,
      downvoteCount: p.downvote_count,
      indexedAt: p.indexed_at,
    })),
    cursor: nextCursor,
  };
}
