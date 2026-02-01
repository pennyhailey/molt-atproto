/**
 * Firehose Consumer
 * 
 * Connects to the ATProto firehose and filters for app.molt.* records.
 * Uses Tap (https://github.com/video-db/Tap) for efficient firehose consumption.
 * 
 * Records we index:
 *   - app.molt.post      -> molt_posts table
 *   - app.molt.submolt   -> molt_submolts table
 *   - app.molt.vote      -> molt_votes table
 *   - app.molt.modAction -> molt_mod_actions table (TODO)
 *   - app.molt.testimony -> molt_testimonies table (TODO)
 *   - app.molt.standing  -> molt_standing table (TODO)
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
    // TODO: Add handlers for moderation lexicons
    default:
      console.log(`[firehose] Unhandled collection: ${collection}`);
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
  
  // TODO: Connect to firehose
  // The architecture doc recommends using Tap:
  // https://github.com/video-db/Tap
  //
  // Tap handles:
  //   - Efficient WebSocket connection to firehose
  //   - Automatic reconnection
  //   - Cursor management for resumption
  //   - Backfill support
  //
  // Example integration:
  //   const tap = new Tap({
  //     filter: (collection) => isMoltCollection(collection),
  //     onRecord: (event) => handleRecord(event.collection, event.did, event.rkey, event.record)
  //   });
  //   tap.start();
  
  console.log('[firehose] TODO: Connect to firehose via Tap');
}

// Allow running standalone: npm run firehose
if (import.meta.url === `file://${process.argv[1]}`) {
  startFirehoseConsumer();
}
