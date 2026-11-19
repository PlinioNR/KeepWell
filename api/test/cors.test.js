import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';

test('CORS aceita portas locais do Flutter e rejeita origens externas', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    for (const origin of [
      'http://localhost:8080',
      'http://localhost:49327',
      'http://127.0.0.1:49327',
      'http://[::1]:49327'
    ]) {
      const response = await fetch(base + '/auth/login', {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type,authorization'
        }
      });
      assert.equal(response.status, 204);
      assert.equal(response.headers.get('access-control-allow-origin'), origin);
      assert.match(response.headers.get('access-control-allow-headers'), /Authorization/);
      const health = await fetch(base + '/health', { headers: { Origin: origin } });
      assert.equal(health.headers.get('access-control-allow-origin'), origin);
    }
    for (const origin of ['http://example.com', 'http://localhost.example.com:8080', 'null']) {
      const response = await fetch(base + '/health', { headers: { Origin: origin } });
      assert.equal(response.headers.get('access-control-allow-origin'), null);
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
