'use strict';

const fs = require('fs');
const path = require('path');

const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'archive']);

const PAIRS = [
	['addEventListener(', 'removeEventListener('],
	['setInterval(', 'clearInterval('],
	['setTimeout(', 'clearTimeout('],
	['requestAnimationFrame(', 'cancelAnimationFrame('],
];

function walk(dir, out = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (EXCLUDE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full, out);
		else if (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) out.push(full);
	}
	return out;
}

function countOccurrences(content, needle) {
	let count = 0;
	let idx = content.indexOf(needle);
	while (idx !== -1) {
		count++;
		idx = content.indexOf(needle, idx + needle.length);
	}
	return count;
}

const root = path.resolve(process.argv[2] || '.');
const files = walk(root);

const totals = PAIRS.map(() => ({ open: 0, close: 0 }));
const perFile = new Map();

for (const file of files) {
	const content = fs.readFileSync(file, 'utf8');
	const counts = PAIRS.map(([open, close]) => ({
		open: countOccurrences(content, open),
		close: countOccurrences(content, close),
	}));
	perFile.set(file, counts);
	counts.forEach((c, i) => {
		totals[i].open += c.open;
		totals[i].close += c.close;
	});
}

const results = { codebaseWide: [], perFileSuspects: [] };

PAIRS.forEach(([open, close], i) => {
	const t = totals[i];
	if (t.open > t.close) {
		results.codebaseWide.push({
			pair: `${open} / ${close}`,
			opens: t.open,
			closes: t.close,
			gap: t.open - t.close,
		});
	}
});

for (const [file, counts] of perFile) {
	const flags = [];
	counts.forEach((c, i) => {
		if (c.open > 0 && c.close === 0) {
			flags.push(`${PAIRS[i][0]} used ${c.open}x, ${PAIRS[i][1]} never appears in this file`);
		}
	});
	if (flags.length > 0) {
		results.perFileSuspects.push({ file: path.relative(root, file), flags });
	}
}

console.log(JSON.stringify(results, null, 2));
