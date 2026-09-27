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

const setPattern = /\bwindow\.([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*([^;]+);/g;
const clearPattern = /\bwindow\.([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:null|undefined)\s*;/g;
const conditionalPattern =
	/(?:if\s*\(\s*|&&\s*|\?\s*)window\.([A-Za-z_$][A-Za-z0-9_$]*)\b(?!\s*=[^=])/g;

const sets = new Map();
const clears = new Set();
const conditionals = new Map();

const functionDeclPattern = /\bfunction\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
const constFunctionPattern =
	/\b(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][A-Za-z0-9_$]*\s*=>)/g;

for (const file of files) {
	const content = fs.readFileSync(file, 'utf8');

	const functionLikeNames = new Set();
	functionDeclPattern.lastIndex = 0;
	let fdm;
	while ((fdm = functionDeclPattern.exec(content))) functionLikeNames.add(fdm[1]);
	constFunctionPattern.lastIndex = 0;
	let cfm;
	while ((cfm = constFunctionPattern.exec(content))) functionLikeNames.add(cfm[1]);

	const lines = content.split('\n');

	lines.forEach((line, idx) => {
		clearPattern.lastIndex = 0;
		let cm;
		while ((cm = clearPattern.exec(line))) clears.add(cm[1]);

		setPattern.lastIndex = 0;
		let sm;
		while ((sm = setPattern.exec(line))) {
			const [, prop, value] = sm;
			const trimmedValue = value.trim();
			if (/^(null|undefined)$/.test(trimmedValue)) continue;
			if (/^(function|\(|async|class|\{)/.test(trimmedValue)) continue;
			if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmedValue) && functionLikeNames.has(trimmedValue))
				continue;
			if (!sets.has(prop)) sets.set(prop, []);
			sets.get(prop).push({ file, line: idx + 1 });
		}

		conditionalPattern.lastIndex = 0;
		let condm;
		while ((condm = conditionalPattern.exec(line))) {
			const prop = condm[1];
			if (!conditionals.has(prop)) conditionals.set(prop, []);
			conditionals.get(prop).push({ file, line: idx + 1 });
		}
	});
}

console.log('== stale window global check ==\n');
console.log('window.* properties assigned a real value, checked elsewhere as if they can go falsy');
console.log('again (if/&&), but never reset to null/undefined anywhere.\n');

let flagged = 0;

for (const [prop, sites] of sets) {
	if (!conditionals.has(prop)) continue;
	if (clears.has(prop)) continue;

	flagged++;
	console.log(
		`window.${prop} - assigned ${sites.length}x, checked conditionally ${conditionals.get(prop).length}x, never cleared:`
	);
	sites.forEach((s) => console.log(`  set:   ${path.relative(root, s.file)}:${s.line}`));
	conditionals
		.get(prop)
		.forEach((s) => console.log(`  check: ${path.relative(root, s.file)}:${s.line}`));
	console.log('');
}

if (!flagged) console.log('nothing flagged.');
