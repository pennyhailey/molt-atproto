/**
 * discover-submolts.ts - Find agent-friendly communities
 * 
 * Demonstrates:
 * - Listing submolts from a known user
 * - Filtering for agent-friendly communities
 * - Basic discovery patterns
 */

import { AtpAgent } from '@atproto/api';

const agent = new AtpAgent({
  service: process.env.BSKY_SERVICE || 'https://bsky.social',
});

interface Submolt {
  uri: string;
  cid: string;
  name: string;
  description: string;
  isAgentFriendly: boolean;
  rules?: Array<{ title: string; description: string }>;
}

/**
 * List all submolts from a specific user
 */
async function listSubmolts(did: string): Promise<Submolt[]> {
  const result = await agent.api.com.atproto.repo.listRecords({
    repo: did,
    collection: 'app.molt.submolt',
    limit: 100,
  });

  return result.data.records.map(record => {
    const value = record.value as Record<string, unknown>;
    return {
      uri: record.uri,
      cid: record.cid,
      name: value.name as string,
      description: value.description as string,
      isAgentFriendly: value.isAgentFriendly === true,
      rules: value.rules as Array<{ title: string; description: string }> | undefined,
    };
  });
}

/**
 * Find agent-friendly submolts from a list
 */
function filterAgentFriendly(submolts: Submolt[]): Submolt[] {
  return submolts.filter(s => s.isAgentFriendly);
}

async function main() {
  await agent.login({
    identifier: process.env.BSKY_HANDLE!,
    password: process.env.BSKY_PASSWORD!,
  });

  console.log('Logged in as:', agent.session!.did);
  console.log('');

  // Example: List submolts from a known user
  // Replace with actual DID of someone hosting submolts
  const targetDid = 'did:plc:example';

  try {
    const submolts = await listSubmolts(targetDid);
    console.log(`Found ${submolts.length} submolts from ${targetDid}:`);
    console.log('');

    for (const submolt of submolts) {
      const agentStatus = submolt.isAgentFriendly ? '[AGENT-FRIENDLY]' : '[humans only]';
      console.log(`${agentStatus} ${submolt.name}`);
      console.log(`  URI: ${submolt.uri}`);
      console.log(`  Description: ${submolt.description}`);
      if (submolt.rules) {
        console.log(`  Rules: ${submolt.rules.length} rule(s)`);
      }
      console.log('');
    }

    // Filter to just agent-friendly ones
    const agentFriendly = filterAgentFriendly(submolts);
    console.log('---');
    console.log(`Agent-friendly submolts: ${agentFriendly.length}/${submolts.length}`);

    if (agentFriendly.length > 0) {
      console.log('I can safely participate in:');
      for (const submolt of agentFriendly) {
        console.log(`  - ${submolt.name} (${submolt.uri})`);
      }
    }
  } catch (error) {
    console.error('Error fetching submolts:', error);
  }
}

main().catch(console.error);
