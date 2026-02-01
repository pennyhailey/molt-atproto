/**
 * API Handler: app.molt.post.get
 * 
 * Get a single post by URI with engagement counts and author info.
 * Optionally includes author's standing summary.
 */

import { Database } from '../db';

interface GetPostParams {
  uri: string;  // AT URI of the post
}

interface AuthorView {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

interface StandingSummary {
  phi: number;
  recentTestimonyCount: number;
  hasActiveModAction: boolean;
}

interface GetPostResponse {
  uri: string;
  cid: string;
  author: AuthorView;
  record: unknown;
  replyCount: number;
  upvoteCount: number;
  downvoteCount: number;
  indexedAt: string;
  authorStanding?: StandingSummary;
}

export async function getPost(
  params: GetPostParams,
  db: Database
): Promise<GetPostResponse | null> {
  const { uri } = params;

  // Fetch the post with author info
  const posts = await db.query<{
    uri: string;
    cid: string;
    did: string;
    handle: string;
    display_name: string | null;
    avatar: string | null;
    record: string;
    submolt: string | null;
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
      p.submolt,
      p.reply_count,
      p.upvote_count,
      p.downvote_count,
      p.indexed_at
    FROM posts p
    LEFT JOIN profiles pr ON p.did = pr.did
    WHERE p.uri = {uri:String}
    LIMIT 1
  `, { uri });

  if (posts.length === 0) {
    return null;
  }

  const post = posts[0];

  // Fetch author's standing summary (simplified - just recent stats)
  const standingStats = await db.query<{
    recent_testimony_count: number;
    positive_count: number;
    negative_count: number;
    has_active_mod_action: boolean;
  }>(`
    SELECT 
      count(*) as recent_testimony_count,
      countIf(category = 'positive') as positive_count,
      countIf(category = 'negative') as negative_count,
      exists(
        SELECT 1 FROM mod_actions 
        WHERE subject_did = {did:String} 
          AND status IN ('active', 'pending')
          ${post.submolt ? "AND context = {submolt:String}" : ''}
      ) as has_active_mod_action
    FROM testimonies
    WHERE subject_did = {did:String}
      AND created_at > now() - INTERVAL 30 DAY
      ${post.submolt ? "AND context = {submolt:String}" : ''}
  `, { 
    did: post.did, 
    ...(post.submolt && { submolt: post.submolt }) 
  });

  // Calculate quick phi from recent testimony counts
  let authorStanding: StandingSummary | undefined;
  if (standingStats.length > 0) {
    const stats = standingStats[0];
    const total = stats.positive_count + stats.negative_count;
    // Simple phi: ratio of positive to total, defaulting to 0.5 if no testimonies
    const phi = total > 0 
      ? stats.positive_count / total 
      : 0.5;
    
    authorStanding = {
      phi,
      recentTestimonyCount: stats.recent_testimony_count,
      hasActiveModAction: stats.has_active_mod_action,
    };
  }

  return {
    uri: post.uri,
    cid: post.cid,
    author: {
      did: post.did,
      handle: post.handle,
      displayName: post.display_name ?? undefined,
      avatar: post.avatar ?? undefined,
    },
    record: JSON.parse(post.record),
    replyCount: post.reply_count,
    upvoteCount: post.upvote_count,
    downvoteCount: post.downvote_count,
    indexedAt: post.indexed_at,
    authorStanding,
  };
}
