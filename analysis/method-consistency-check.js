'use strict';

const fs = require('fs');
const path = require('path');

const RARE_USE_CEILING = 2;
const DOMINANCE_MULTIPLIER = 3;
const MAX_EDIT_DISTANCE = 3;

const BUILTIN_NAMESPACES = new Set([
	'Math',
	'JSON',
	'Object',
	'Array',
	'Reflect',
	'Number',
	'String',
	'Date',
	'Promise',
	'Symbol',
	'Proxy',
	'Intl',
	'Boolean',
	'RegExp',
	'Error',
	'Map',
	'Set',
	'WeakMap',
	'WeakSet',
]);

function walk(dir, out = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full, out);
		else if (entry.name.endsWith('.js')) out.push(full);
	}
	return out;
}

function levenshtein(a, b) {
	const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
	for (let j = 0; j <= b.length; j++) dp[0][j] = j;
	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			dp[i][j] =
				a[i - 1] === b[j - 1]
					? dp[i - 1][j - 1]
					: 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
		}
	}
	return dp[a.length][b.length];
}

const target = process.argv[2] || '.';
const files = walk(target);

const callPattern = /\b([A-Z][A-Za-z0-9_]*)\.([a-zA-Z_][A-Za-z0-9_]*)\s*\(/g;
const usage = new Map();

for (const file of files) {
	const content = fs.readFileSync(file, 'utf8');
	const lines = content.split('\n');
	lines.forEach((line, idx) => {
		callPattern.lastIndex = 0;
		let m;
		while ((m = callPattern.exec(line))) {
			const [, ns, method] = m;
			if (!usage.has(ns)) usage.set(ns, new Map());
			const methods = usage.get(ns);
			if (!methods.has(method)) methods.set(method, []);
			methods.get(method).push({ file, line: idx + 1 });
		}
	});
}

const flagged = [];

for (const [ns, methods] of usage) {
	if (BUILTIN_NAMESPACES.has(ns)) continue;
	if (methods.size < 2) continue;
	const entries = [...methods.entries()];

	for (const [method, sites] of entries) {
		if (sites.length > RARE_USE_CEILING) continue;

		for (const [otherMethod, otherSites] of entries) {
			if (otherMethod === method) continue;
			if (otherSites.length < sites.length * DOMINANCE_MULTIPLIER) continue;

			const dist = levenshtein(method, otherMethod);
			const isPrefixVariant = method.startsWith(otherMethod) || otherMethod.startsWith(method);
			const closeEdit = dist > 0 && dist <= MAX_EDIT_DISTANCE;

			if (closeEdit || isPrefixVariant) {
				flagged.push({
					namespace: ns,
					rareMethod: method,
					rareMethodUses: sites.length,
					dominantMethod: otherMethod,
					dominantMethodUses: otherSites.length,
					reason: isPrefixVariant ? 'prefix variant' : `edit distance ${dist}`,
					rareMethodSites: sites.map((s) => `${path.relative(target, s.file)}:${s.line}`),
				});
			}
		}
	}
}

console.log(JSON.stringify({ flagged }, null, 2));
