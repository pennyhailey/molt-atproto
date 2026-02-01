/**
 * Firehose Consumer
 * 
 * Connects to the ATProto firehose and filters for app.molt.* records.
 * Uses Tap (https://docs.bsky.app/blog/introducing-tap) for efficient firehose consumption.
 * 
 * Records we index:
 *   - app.molt.post             -> molt_posts table
 *   - app.molt.submolt          -> molt_submolts table
 *   - app.molt.vote             -> molt_votes table
 *   - app.molt.modAction        -> molt_mod_actions table
 *   - app.molt.appeal           -> molt_appeals table
 *   - app.molt.appealResolution -> molt_appeal_resolutions table
 *   - app.molt.testimony        -> molt_testimonies table
 *   - app.molt.standing         -> molt_standing table
 */

import { db } from '../db/index.js';

const MOLT_COLLECTIONS = [
  'app.molt.post',
  'app.molt.submolt',
  'app.molt.vote',
  'app.molt.modAction',
  'app.molt.appeal',
  'app.molt.appealResolution',
  'app.molt.testimony',
  'app.molt.standing',
] as const;

type MoltCollection = typeof MOLT_COLLECTIONS[number];

function isMoltCollection(collection: string): collection is MoltCollection {
  return MOLT_COLLECTIONS.includes(collection as MoltCollection);
}

/**
 * Handle a record from the firehose
 */
async function handleRecord(
  collection: MoltCollection,
  did: string,
  rkey: string,
  record: unknown
) {
  const uri = `at://${did}/${collection}/${rkey}`;
  
  switch (collection) {
    case 'app.molt.post':
      await db.indexPost(uri, did, rkey, record);
      break;
    case 'app.molt.submolt':
      await db.indexSubmolt(uri, did, rkey, record);
      break;
    case 'app.molt.vote':
      await db.indexVote(uri, did, rkey, record);
      break;
    case 'app.molt.modAction':
      await db.indexModAction(uri, did, rkey, record);
      break;
    case 'app.molt.appeal':
      await db.indexAppeal(uri, did, rkey, record);
      break;
    case 'app.molt.appealResolution':
      await db.indexAppealResolution(uri, did, rkey, record);
      break;
    case 'app.molt.testimony':
      await db.indexTestimony(uri, did, rkey, record);
      break;
    case 'app.molt.standing':
      await db.indexStanding(uri, did, rkey, record);
      break;
    default:
      // TypeScript will catch if we miss a case
      const _exhaustive: never = collection;
      console.log(`[firehose] Unhandled collection: ${_exhaustive}`);
  }
}

/**
 * Start the firehose consumer
 * 
 * TODO: Integrate with Tap for proper firehose consumption
 * For now, this is a placeholder that logs the intended behavior.
 */
export function startFirehoseConsumer() {
  console.log('[firehose] Starting firehose consumer...');
  console.log('[firehose] Watching collections:', MOLT_COLLECTIONS.join(', '));
  
  // TODO: Connect to firehose via Tap
  // 
  // Tap handles:
  //   - Efficient WebSocket connection to firehose
  //   - Automatic reconnection and backfill
  //   - Cursor management for resumption
  //   - Verification of signatures
  //
  // To use with Tap, we'd configure it to:
  //   1. Filter for app.molt.* collections using TAP_SIGNAL_COLLECTION
  //   2. Connect to our handleRecord via webhooks or websocket
  //
  // Example Tap setup:
  //   TAP_SIGNAL_COLLECTION=app.molt.post
  //   (This auto-tracks any repo that creates an app.molt.post)
  //
  // Then connect via:
  //   websocat ws://localhost:2480/channel
  //   or configure webhook delivery to our API
  
  console.log('[firehose] TODO: Connect to firehose via Tap');
  console.log('[firehose] See: https://docs.bsky.app/blog/introducing-tap');
}

// Allow running standalone: npm run firehose
if (import.meta.url === `file://${process.argv[1]}`) {
  startFirehoseConsumer();
}
