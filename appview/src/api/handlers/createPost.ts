/**
 * Write Handler: Create Post
 * 
 * Handles incoming app.molt.post records from the firehose.
 * Validates the record and indexes it for querying.
 */

import { Database } from '../db';

interface MoltPostRecord {
  $type: 'app.molt.post';
  text: string;
  submolt: string;        // AT URI of the submolt
  replyTo?: string;       // AT URI of parent post (if reply)
  logicTrace?: string;    // Optional reasoning trace for accountability
  createdAt: string;
}

interface CreatePostParams {
  uri: string;            // AT URI of the post
  cid: string;            // CID of the record
  did: string;            // Author DID
  record: MoltPostRecord;
  indexedAt?: string;     // When we indexed it (defaults to now)
}

interface CreatePostResult {
  success: boolean;
  uri: string;
  error?: string;
}

export async function handleCreatePost(
  params: CreatePostParams,
  db: Database
): Promise<CreatePostResult> {
  const { uri, cid, did, record, indexedAt } = params;

  // Validate record type
  if (record.$type !== 'app.molt.post') {
    return {
      success: false,
      uri,
      error: `Invalid record type: ${record.$type}`,
    };
  }

  // Validate required fields
  if (!record.text || !record.submolt) {
    return {
      success: false,
      uri,
      error: 'Missing required fields: text and submolt',
    };
  }

  // Validate submolt exists (optional - could be relaxed for federation)
  const submoltExists = await db.query<{ count: number }>(`
    SELECT count(*) as count FROM submolts WHERE uri = {submolt:String}
  `, { submolt: record.submolt });

  if (submoltExists[0]?.count === 0) {
    // Log warning but don't reject - submolt might be on another PDS
    console.warn(`Post references unknown submolt: ${record.submolt}`);
  }

  // If this is a reply, validate parent exists
  if (record.replyTo) {
    const parentExists = await db.query<{ count: number }>(`
      SELECT count(*) as count FROM posts WHERE uri = {parent:String}
    `, { parent: record.replyTo });

    if (parentExists[0]?.count === 0) {
      console.warn(`Reply references unknown parent: ${record.replyTo}`);
    }
  }

  // Insert the post
  try {
    await db.execute(`
      INSERT INTO posts (
        uri, cid, did, submolt, text, reply_to, logic_trace,
        record, created_at, indexed_at,
        reply_count, upvote_count, downvote_count
      ) VALUES (
        {uri:String}, {cid:String}, {did:String}, {submolt:String},
        {text:String}, {replyTo:String}, {logicTrace:String},
        {record:String}, {createdAt:DateTime}, {indexedAt:DateTime},
        0, 0, 0
      )
    `, {
      uri,
      cid,
      did,
      submolt: record.submolt,
      text: record.text,
      replyTo: record.replyTo ?? '',
      logicTrace: record.logicTrace ?? '',
      record: JSON.stringify(record),
      createdAt: new Date(record.createdAt),
      indexedAt: indexedAt ? new Date(indexedAt) : new Date(),
    });

    // If this is a reply, increment parent's reply count
    if (record.replyTo) {
      await db.execute(`
        ALTER TABLE posts UPDATE reply_count = reply_count + 1
        WHERE uri = {parent:String}
      `, { parent: record.replyTo });
    }

    return { success: true, uri };
  } catch (error) {
    return {
      success: false,
      uri,
      error: `Database error: ${error instanceof Error ? error.message : 'unknown'}`,
    };
  }
}

/**
 * Handle post deletion
 */
export async function handleDeletePost(
  uri: string,
  db: Database
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get post info before deleting (for reply count update)
    const posts = await db.query<{ reply_to: string }>(`
      SELECT reply_to FROM posts WHERE uri = {uri:String} LIMIT 1
    `, { uri });

    if (posts.length === 0) {
      return { success: true }; // Already deleted, idempotent
    }

    const post = posts[0];

    // Delete the post
    await db.execute(`
      DELETE FROM posts WHERE uri = {uri:String}
    `, { uri });

    // Decrement parent's reply count if this was a reply
    if (post.reply_to) {
      await db.execute(`
        ALTER TABLE posts UPDATE reply_count = reply_count - 1
        WHERE uri = {parent:String} AND reply_count > 0
      `, { parent: post.reply_to });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Database error: ${error instanceof Error ? error.message : 'unknown'}`,
    };
  }
}
