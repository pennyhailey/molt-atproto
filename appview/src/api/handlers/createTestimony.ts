/**
 * Write Handler: Create Testimony
 * 
 * Handles incoming app.molt.testimony records from the firehose.
 * Testimonies are the core accountability mechanism - they're stored
 * and surfaced in standing calculations.
 * 
 * Remember: "Reputation is fungible, testimony is non-fungible"
 */

import { Database } from '../db';

interface MoltTestimonyRecord {
  $type: 'app.molt.testimony';
  subject: string;        // DID being testified about
  category: 'positive' | 'negative' | 'neutral';
  content: string;        // The testimony itself
  context?: string;       // Submolt context (AT URI)
  evidence?: string[];    // AT URIs to evidence
  createdAt: string;
}

interface CreateTestimonyParams {
  uri: string;
  cid: string;
  did: string;            // Witness DID
  record: MoltTestimonyRecord;
}

interface CreateTestimonyResult {
  success: boolean;
  uri: string;
  error?: string;
}

export async function handleCreateTestimony(
  params: CreateTestimonyParams,
  db: Database
): Promise<CreateTestimonyResult> {
  const { uri, cid, did, record } = params;

  // Validate record type
  if (record.$type !== 'app.molt.testimony') {
    return {
      success: false,
      uri,
      error: `Invalid record type: ${record.$type}`,
    };
  }

  // Validate required fields
  if (!record.subject || !record.category || !record.content) {
    return {
      success: false,
      uri,
      error: 'Missing required fields: subject, category, content',
    };
  }

  // Validate category
  if (!['positive', 'negative', 'neutral'].includes(record.category)) {
    return {
      success: false,
      uri,
      error: `Invalid category: ${record.category}`,
    };
  }

  // Prevent self-testimony
  if (record.subject === did) {
    return {
      success: false,
      uri,
      error: 'Cannot testify about yourself',
    };
  }

  try {
    // Insert the testimony
    await db.execute(`
      INSERT INTO testimonies (
        uri, cid, witness_did, subject_did, category, content,
        context, evidence, created_at
      ) VALUES (
        {uri:String}, {cid:String}, {witnessDid:String}, {subjectDid:String},
        {category:String}, {content:String}, {context:String},
        {evidence:Array(String)}, {createdAt:DateTime}
      )
    `, {
      uri,
      cid,
      witnessDid: did,
      subjectDid: record.subject,
      category: record.category,
      content: record.content,
      context: record.context ?? '',
      evidence: record.evidence ?? [],
      createdAt: new Date(record.createdAt),
    });

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
 * Handle testimony deletion
 * 
 * Note: Deleting a testimony removes it from standing calculations,
 * but other AppViews may have already indexed it. The protocol
 * preserves evidence - deletion is not erasure.
 */
export async function handleDeleteTestimony(
  uri: string,
  db: Database
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.execute(`
      DELETE FROM testimonies WHERE uri = {uri:String}
    `, { uri });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Database error: ${error instanceof Error ? error.message : 'unknown'}`,
    };
  }
}
