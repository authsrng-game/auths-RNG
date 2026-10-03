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
	} catch (err) {
		console.warn('[sync] rejected sync payload: invalid JSON body', {
			error: err ? err.message || err : 'unknown error',
		});
		return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400, headers });
	}

	const {
		totalRolls,
		totalPlaytime,
		userId,
		shopPoints,
		points,
		mutationTrust,
		trust,
		anomalies,
		anomaliesUsed,
		runeBlocks,
	} = body || {};
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
		console.warn('[sync] rejected sync payload: totalRolls exceeds max physically possible gain', {
			userId,
			rolls,
			playtime,
		});
		return new Response(JSON.stringify({ error: 'implausible progress' }), {
			status: 400,
			headers,
		});
	}

	const pointsVal = shopPoints !== undefined ? shopPoints : points;
	if (pointsVal !== undefined) {
		const pts = parseInt(pointsVal, 10);
		// Max rarity sell = 2e15 (SUMMER x2 dupe); Max printer rate = 1e9 pts/s; Starter buffer = 1e15
		const maxPossiblePoints = rolls * 2e15 + playtime * 1000000000 + 1e15;
		if (isNaN(pts) || pts < 0 || pts > maxPossiblePoints) {
			console.warn(
				'[sync] rejected sync payload: shopPoints exceeds max physically possible gain',
				{
					userId,
					pts,
					rolls,
					playtime,
				}
			);
			return new Response(JSON.stringify({ error: 'implausible progress' }), {
				status: 400,
				headers,
			});
		}
	}

	// Generated code starts here on 2026-10-29T00:00:00Z:
	const trustVal = mutationTrust !== undefined ? mutationTrust : trust;
	if (trustVal !== undefined) {
		const trst = parseInt(trustVal, 10);
		// Max trust gain rate = 16 trust / 15s cooldown (~1.07 trust/s); Starter buffer = 1000
		const maxPossibleTrust = playtime * 2 + 1000;
		if (isNaN(trst) || trst < 0 || trst > maxPossibleTrust) {
			console.warn(
				'[sync] rejected sync payload: mutationTrust exceeds max physically possible gain',
				{
					userId,
					trst,
					rolls,
					playtime,
				}
			);
			return new Response(JSON.stringify({ error: 'implausible progress' }), {
				status: 400,
				headers,
			});
		}
	}
	// Generated code ends here on 2026-10-29T00:00:00Z:

	// Generated code starts here on 2026-03-31T00:00:00Z:
	const checkAnomalyVal = (val, fieldName) => {
		if (val !== undefined) {
			const num = Number(val);
			// Max passive gain = ~100 anomalies/s; Double clover buffer = 50M; Starter buffer = 100M
			const maxPossibleAnomalies = playtime * 100 + 100000000;
			if (isNaN(num) || num < 0 || num > maxPossibleAnomalies) {
				console.warn(
					`[sync] rejected sync payload: ${fieldName} exceeds max physically possible gain`,
					{
						userId,
						val: num,
						rolls,
						playtime,
					}
				);
				return false;
			}
		}
		return true;
	};

	if (
		!checkAnomalyVal(anomalies, 'anomalies') ||
		!checkAnomalyVal(anomaliesUsed, 'anomaliesUsed')
	) {
		return new Response(JSON.stringify({ error: 'implausible progress' }), {
			status: 400,
			headers,
		});
	}
	// Generated code ends here on 2026-03-31T00:00:00Z:

	// Generated code starts here on 2026-04-01T00:00:00Z:
	if (runeBlocks !== undefined) {
		const blks = Number(runeBlocks);
		// Max exchange rate = 10 blocks/rune ('moreBlocks'); Max rolls = maxPossibleRolls; Starter/bonus buffer = 100000
		const maxPossibleRuneBlocks = maxPossibleRolls * 10 + 100000;
		if (isNaN(blks) || blks < 0 || blks > maxPossibleRuneBlocks) {
			console.warn(
				'[sync] rejected sync payload: runeBlocks exceeds max physically possible gain',
				{
					userId,
					blks,
					rolls,
					playtime,
				}
			);
			return new Response(JSON.stringify({ error: 'implausible progress' }), {
				status: 400,
				headers,
			});
		}
	}
	// Generated code ends here on 2026-04-01T00:00:00Z:

	return new Response(JSON.stringify({ ok: true }), { headers });
}
// Generated code ends here on 2026-10-27T00:00:00Z:
