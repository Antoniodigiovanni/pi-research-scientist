import { createScholarlyClients } from '../extensions/scholarly/index.ts';

// Deliberately keyless and public-only. Never reads project data or user credentials.
if (process.env.PI_RESEARCH_SCIENTIST_LIVE_SCHOLARLY !== 'true') {
  console.log('Skipped: set PI_RESEARCH_SCIENTIST_LIVE_SCHOLARLY=true to query the five public scholarly services.');
} else {
  const clients = createScholarlyClients({});
  const results = await Promise.all(Object.entries(clients).map(async ([provider, client]) => {
    const query = provider === 'openreview' ? 'transformer' : 'attention is all you need';
    try {
      const page = await client.search(query, { limit: 1 });
      return { provider, query, count: page.records.length, title: page.records[0]?.title, next: page.next, total: page.total };
    } catch (error) {
      return { provider, query, error: error instanceof Error ? error.message : 'Request failed' };
    }
  }));
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
  if (results.some(result => 'error' in result)) process.exitCode = 1;
}
