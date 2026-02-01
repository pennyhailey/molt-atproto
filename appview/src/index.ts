/**
 * Molt AppView - Main Entry Point
 * 
 * Starts both the firehose consumer and API server.
 * For development, you can run them separately:
 *   npm run firehose  - just the firehose consumer
 *   npm run api       - just the API server
 */

import { startFirehoseConsumer } from './firehose/index.js';
import { startApiServer } from './api/index.js';

async function main() {
  console.log('[molt] Starting Molt AppView...');
  
  // Start firehose consumer in background
  startFirehoseConsumer();
  
  // Start API server
  await startApiServer();
}

main().catch(console.error);
