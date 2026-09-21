export async function onRequest(context) {
	const { request, env } = context;

	const headers = {
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': '*',
	};

	if (request.method === 'POST') {
		const url = new URL(request.url);
		const sid = url.searchParams.get('sid');
		// Generated code starts here on 2026-06-18T00:30:00Z:
		const SID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;
		if (!sid || !SID_REGEX.test(sid)) {
			return new Response(JSON.stringify({ error: 'missing or invalid sid' }), {
				status: 400,
				headers,
			});
		}
		// Generated code ends here on 2026-06-18T00:30:00Z:

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
} // for da webgamedb!!!!!
