// Generated code starts here on 2026-10-27T00:00:00Z:
export async function onRequest(context) {
	const { request } = context;
	const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: 204,
			headers: { ...headers, 'Access-Control-Allow-Methods': 'POST, OPTIONS' },
		});
	}

	if (request.method !== 'POST') {
		return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400, headers });
	}

	const { totalRolls, totalPlaytime, userId } = body || {};
	const rolls = parseInt(totalRolls, 10);
	const playtime = parseInt(totalPlaytime || '0', 10);

	if (isNaN(rolls) || rolls < 0 || isNaN(playtime) || playtime < 0) {
		console.warn('[sync] rejected sync payload: negative or non-numeric progress metrics', {
			userId,
		});
		return new Response(JSON.stringify({ error: 'implausible progress' }), {
			status: 400,
			headers,
		});
	}

	// Max manual speed = 4 rolls/s (250ms cooldown cap); Max expedition burst = 4000 (MAX_SIM_ROLLS)
	const maxPossibleRolls = playtime * 4 + 4000;
	if (rolls > maxPossibleRolls) {
		console.warn(
			'[sync] rejected sync payload: totalRolls exceeds max physically possible gain',
			{ userId, rolls, playtime }
		);
		return new Response(JSON.stringify({ error: 'implausible progress' }), {
			status: 400,
			headers,
		});
	}

	return new Response(JSON.stringify({ ok: true }), { headers });
}
// Generated code ends here on 2026-10-27T00:00:00Z:
