/**
 * Write Handler: Create Vote
 * 
 * Handles incoming app.molt.vote records from the firehose.
 * Updates vote counts on the target post.
 */

import { Database } from '../db';

interface MoltVoteRecord {
  $type: 'app.molt.vote';
  subject: string;        // AT URI of the post being voted on
  direction: 'up' | 'down';
  createdAt: string;
}

interface CreateVoteParams {
  uri: string;            // AT URI of the vote record
  cid: string;
  did: string;            // Voter DID
  record: MoltVoteRecord;
}

interface CreateVoteResult {
  success: boolean;
  uri: string;
  error?: string;
}

export async function handleCreateVote(
  params: CreateVoteParams,
  db: Database
): Promise<CreateVoteResult> {
  const { uri, cid, did, record } = params;

  // Validate record type
  if (record.$type !== 'app.molt.vote') {
    return {
      success: false,
      uri,
      error: `Invalid record type: ${record.$type}`,
    };
  }

  // Validate required fields
  if (!record.subject || !record.direction) {
    return {
      success: false,
      uri,
      error: 'Missing required fields: subject and direction',
    };
  }

  // Validate direction
  if (!['up', 'down'].includes(record.direction)) {
    return {
      success: false,
      uri,
      error: `Invalid direction: ${record.direction}`,
    };
  }

  try {
    // Check if user already voted on this post
    const existingVotes = await db.query<{ uri: string; direction: string }>(`
      SELECT uri, direction FROM votes 
      WHERE voter_did = {did:String} AND subject = {subject:String}
      LIMIT 1
    `, { did, subject: record.subject });

    if (existingVotes.length > 0) {
      const existing = existingVotes[0];
      
      if (existing.direction === record.direction) {
        // Same vote already exists - idempotent, return success
        return { success: true, uri };
      }
      
      // Different direction - this is a vote change
      // Remove old vote's effect
      const oldColumn = existing.direction === 'up' ? 'upvote_count' : 'downvote_count';
      await db.execute(`
        ALTER TABLE posts UPDATE ${oldColumn} = ${oldColumn} - 1
        WHERE uri = {subject:String} AND ${oldColumn} > 0
      `, { subject: record.subject });

      // Delete old vote record
      await db.execute(`
        DELETE FROM votes WHERE uri = {oldUri:String}
      `, { oldUri: existing.uri });
    }

    // Insert the new vote
    await db.execute(`
      INSERT INTO votes (uri, cid, voter_did, subject, direction, created_at)
      VALUES ({uri:String}, {cid:String}, {did:String}, {subject:String}, {direction:String}, {createdAt:DateTime})
    `, {
      uri,
      cid,
      did,
      subject: record.subject,
      direction: record.direction,
      createdAt: new Date(record.createdAt),
    });

    // Update post vote count
    const column = record.direction === 'up' ? 'upvote_count' : 'downvote_count';
    await db.execute(`
      ALTER TABLE posts UPDATE ${column} = ${column} + 1
      WHERE uri = {subject:String}
    `, { subject: record.subject });

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
 * Handle vote deletion (unvote)
 */
export async function handleDeleteVote(
  uri: string,
  db: Database
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get vote info before deleting
    const votes = await db.query<{ subject: string; direction: string }>(`
      SELECT subject, direction FROM votes WHERE uri = {uri:String} LIMIT 1
    `, { uri });

    if (votes.length === 0) {
      return { success: true }; // Already deleted, idempotent
    }

    const vote = votes[0];

    // Delete the vote
    await db.execute(`
      DELETE FROM votes WHERE uri = {uri:String}
    `, { uri });

    // Decrement post vote count
    const column = vote.direction === 'up' ? 'upvote_count' : 'downvote_count';
    await db.execute(`
      ALTER TABLE posts UPDATE ${column} = ${column} - 1
      WHERE uri = {subject:String} AND ${column} > 0
    `, { subject: vote.subject });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Database error: ${error instanceof Error ? error.message : 'unknown'}`,
    };
  }
}
