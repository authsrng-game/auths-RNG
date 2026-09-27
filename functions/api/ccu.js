export async function onRequest(context) {
	const { request, env } = context;

	const headers = {
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': '*',
	};

	// Generated code starts here on 2026-03-31T22:00:00Z:
	try {
		if (request.method === 'POST') {
			const url = new URL(request.url);
			const sid = url.searchParams.get('sid');
			const SID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;
			if (!sid || !SID_REGEX.test(sid)) {
				return new Response(JSON.stringify({ error: 'missing or invalid sid' }), {
					status: 400,
					headers,
				});
			}

			// store session with 3 minute ttl (auto-expires if heartbeat stops)
			await env.CCU_KV.put(`session:${sid}`, '1', { expirationTtl: 180 });
			return new Response(JSON.stringify({ ok: true }), { headers });
		}

		// Poll: GET /api/ccu
		if (request.method === 'GET') {
			const list = await env.CCU_KV.list({ prefix: 'session:' });
			return new Response(JSON.stringify({ ccu: list.keys.length }), { headers });
		}

		return new Response('Method not allowed', { status: 405 });
	} catch (err) {
		console.error('[ccu] handler error:', err);
		return new Response(JSON.stringify({ error: 'internal server error' }), {
			status: 500,
			headers,
		});
	}
	// Generated code ends here on 2026-03-31T22:00:00Z:
} // for da webgamedb!!!!!
