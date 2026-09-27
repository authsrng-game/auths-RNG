const { test, expect } = require('@playwright/test');

// Generated code starts here on 2026-03-31T00:00:00Z:
test.describe('CCU API Security & CORS Preflight Tests', () => {
	test('OPTIONS preflight returns 204 with required CORS headers', async () => {
		const { onRequest } = await import('../../functions/api/ccu.js');
		const req = { method: 'OPTIONS', url: 'https://example.com/api/ccu' };
		const context = { request: req, env: {} };

		const res = await onRequest(context);
		expect(res.status).toBe(204);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
		expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
		expect(res.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
	});

	test('unsupported HTTP method returns 405 with headers', async () => {
		const { onRequest } = await import('../../functions/api/ccu.js');
		const req = { method: 'DELETE', url: 'https://example.com/api/ccu' };
		const context = { request: req, env: {} };

		const res = await onRequest(context);
		expect(res.status).toBe(405);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
		const body = await res.json();
		expect(body.error).toBe('Method not allowed');
	});
});
// Generated code ends here on 2026-03-31T00:00:00Z:
