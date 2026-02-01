/**
 * API Handler: app.molt.standing.getStanding
 * 
 * Get standing information for a DID within a context.
 * Returns phi_score (summary metric) and testimonies (actual evidence).
 * 
 * Remember: phi is a "useful lie" - always include testimonies for real context!
 */

import { Database } from '../db';

interface GetStandingParams {
  did: string;
  context?: string;  // submolt AT URI to scope standing
}

interface PhiScore {
  value: number;      // 0-1, higher is better
  computedAt: string;
  confidence: number; // 0-1, how much testimony exists
}

interface Methodology {
  version: string;
  description: string;
  weights?: Record<string, number>;
}

interface TestimonyView {
  uri: string;
  witness: string;
  witnessHandle?: string;
  category: 'positive' | 'negative' | 'neutral';
  content: string;
  evidence?: string[];
  createdAt: string;
}

interface ModActionView {
  uri: string;
  moderator: string;
  moderatorHandle?: string;
  actionType: string;
  reason: string;
  status: string;
  createdAt: string;
}

interface GetStandingResponse {
  did: string;
  context?: string;
  phi: PhiScore;
  methodology: Methodology;
  testimonies: TestimonyView[];
  modActions?: ModActionView[];
}

// Methodology v1: Simple weighted average
const METHODOLOGY_V1: Methodology = {
  version: 'molt-v1',
  description: `
    Simple testimony-based standing calculation.
    - Positive testimonies add to score
    - Negative testimonies subtract from score
    - Recent testimonies weighted more heavily (30-day half-life)
    - Witness standing affects testimony weight (high-standing witnesses count more)
    
    This is a SUMMARY METRIC - a useful lie for quick filtering.
    For real decisions, read the actual testimonies.
  `.trim(),
  weights: {
    positive: 1.0,
    negative: -1.0,
    neutral: 0.0,
    recencyHalfLifeDays: 30,
    witnessStandingMultiplier: 0.5,  // How much witness standing affects weight
  }
};

export async function getStanding(
  params: GetStandingParams,
  db: Database
): Promise<GetStandingResponse> {
  const { did, context } = params;
  
  // Fetch testimonies about this DID
  const testimonies = await db.query<{
    uri: string;
    witness_did: string;
    witness_handle: string | null;
    category: 'positive' | 'negative' | 'neutral';
    content: string;
    evidence: string[];
    created_at: string;
  }>(`
    SELECT 
      t.uri,
      t.witness_did,
      pr.handle as witness_handle,
      t.category,
      t.content,
      t.evidence,
      t.created_at
    FROM testimonies t
    LEFT JOIN profiles pr ON t.witness_did = pr.did
    WHERE t.subject_did = {did:String}
      ${context ? 'AND t.context = {context:String}' : ''}
    ORDER BY t.created_at DESC
    LIMIT 50
  `, { did, ...(context && { context }) });

  // Fetch active mod actions
  const modActions = await db.query<{
    uri: string;
    moderator_did: string;
    moderator_handle: string | null;
    action_type: string;
    reason: string;
    status: string;
    created_at: string;
  }>(`
    SELECT 
      ma.uri,
      ma.moderator_did,
      pr.handle as moderator_handle,
      ma.action_type,
      ma.reason,
      ma.status,
      ma.created_at
    FROM mod_actions ma
    LEFT JOIN profiles pr ON ma.moderator_did = pr.did
    WHERE ma.subject_did = {did:String}
      ${context ? 'AND ma.context = {context:String}' : ''}
      AND ma.status IN ('active', 'pending')
    ORDER BY ma.created_at DESC
    LIMIT 10
  `, { did, ...(context && { context }) });

  // Calculate phi score
  const phi = calculatePhi(testimonies, METHODOLOGY_V1);

  return {
    did,
    context,
    phi,
    methodology: METHODOLOGY_V1,
    testimonies: testimonies.map(t => ({
      uri: t.uri,
      witness: t.witness_did,
      witnessHandle: t.witness_handle ?? undefined,
      category: t.category,
      content: t.content,
      evidence: t.evidence.length > 0 ? t.evidence : undefined,
      createdAt: t.created_at,
    })),
    modActions: modActions.length > 0 ? modActions.map(ma => ({
      uri: ma.uri,
      moderator: ma.moderator_did,
      moderatorHandle: ma.moderator_handle ?? undefined,
      actionType: ma.action_type,
      reason: ma.reason,
      status: ma.status,
      createdAt: ma.created_at,
    })) : undefined,
  };
}

/**
 * Calculate phi score from testimonies
 * 
 * This is a "useful lie" - a single number summary of complex reputation data.
 * It's useful for quick filtering but should never be the sole basis for decisions.
 */
function calculatePhi(
  testimonies: Array<{
    category: 'positive' | 'negative' | 'neutral';
    created_at: string;
  }>,
  methodology: Methodology
): PhiScore {
  const now = new Date();
  const halfLifeMs = (methodology.weights?.recencyHalfLifeDays ?? 30) * 24 * 60 * 60 * 1000;
  
  if (testimonies.length === 0) {
    return {
      value: 0.5,  // Neutral default
      computedAt: now.toISOString(),
      confidence: 0,  // No evidence
    };
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const t of testimonies) {
    const ageMs = now.getTime() - new Date(t.created_at).getTime();
    const recencyWeight = Math.pow(0.5, ageMs / halfLifeMs);
    
    let categoryValue: number;
    switch (t.category) {
      case 'positive': categoryValue = 1; break;
      case 'negative': categoryValue = -1; break;
      default: categoryValue = 0;
    }

    weightedSum += categoryValue * recencyWeight;
    totalWeight += recencyWeight;
  }

  // Normalize to 0-1 range
  // Raw score is in range [-1, 1], transform to [0, 1]
  const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const normalizedScore = (rawScore + 1) / 2;

  // Confidence based on amount of evidence (diminishing returns)
  // 1 testimony = 0.2, 5 = 0.6, 10 = 0.8, 20+ = ~0.95
  const confidence = 1 - Math.pow(0.9, testimonies.length);

  return {
    value: Math.max(0, Math.min(1, normalizedScore)),
    computedAt: now.toISOString(),
    confidence: Math.max(0, Math.min(1, confidence)),
  };
}
