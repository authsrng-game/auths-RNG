'use strict';

const fs = require('fs');
const path = require('path');

const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'archive']);

function walk(dir, out = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (EXCLUDE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full, out);
		else if (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) out.push(full);
	}
	return out;
}

const root = path.resolve(process.argv[2] || '.');
const files = walk(root);

const treeHasVisibilityHandling = files.some((f) =>
	/visibilitychange/.test(fs.readFileSync(f, 'utf8'))
);

const flagged = [];

for (const file of files) {
	const content = fs.readFileSync(file, 'utf8');
	const intervalCount = (content.match(/\bsetInterval\s*\(/g) || []).length;
	const rafCount = (content.match(/\brequestAnimationFrame\s*\(/g) || []).length;
	if (intervalCount + rafCount === 0) continue;

	flagged.push({
		file: path.relative(root, file),
		setIntervalCount: intervalCount,
		requestAnimationFrameCount: rafCount,
	});
}

const result = {
	anyVisibilityHandlingInTree: treeHasVisibilityHandling,
	note: treeHasVisibilityHandling
		? 'visibilitychange exists somewhere in this tree, files below may already be covered by a central handler, verify before treating as a gap'
		: 'no visibilitychange handling found anywhere in this tree, every file below is a real candidate',
	timerFilesWithNoLocalGuard: flagged,
};

console.log(JSON.stringify(result, null, 2));
