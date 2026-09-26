import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { requestText, requestJson, loopbackUrl } from '../src/http.ts';
import { chunkText } from '../src/text.ts';
test('bounded HTTP sanitizes errors, rejects redirects and enforces bytes', async () => {
  const server = createServer((req, res) => {
	    if (req.url === '/error') { res.writeHead(401); res.end('redact'); }
    else if (req.url === '/redirect') { res.writeHead(302, { Location: '/error' }); res.end(); }
    else res.end('abcdef');
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing server');
  const base = `http://127.0.0.1:${address.port}`;
  try {
	    await assert.rejects(requestText(base + '/error', { headers: { Authorization: 'Bearer redact' } }), e => !String(e).includes('redact') && String(e).includes('401'));
    await assert.rejects(requestText(base + '/redirect'));
    await assert.rejects(requestText(base, { maxBytes: 3 }));
    await assert.rejects(requestJson(base), /invalid JSON/);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
test('URL policy and bounded chunks', () => {
  assert.throws(() => loopbackUrl('https://example.com'));
  assert.deepEqual(chunkText('abcdef', 2, 2), { text: 'cd', offset: 2, nextOffset: 4, totalCharacters: 6 });
  assert.throws(() => chunkText('a', 0, 20001));
});
