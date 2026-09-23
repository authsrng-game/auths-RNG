'use strict';

const fs = require('fs');
const path = require('path');

const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'archive']);

function walk(dir, exts, out = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (EXCLUDE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full, exts, out);
		else if (exts.some((e) => entry.name.endsWith(e))) out.push(full);
	}
	return out;
}

function isLocalPath(p) {
	if (!p) return false;
	if (/^(https?:)?\/\//.test(p)) return false;
	if (p.startsWith('mailto:') || p.startsWith('tel:') || p.startsWith('data:')) return false;
	if (p.startsWith('#')) return false;
	if (p.startsWith('javascript:')) return false;
	if (p.includes('${')) return false;
	return true;
}

function resolveCandidate(root, fromFile, refPath) {
	const clean = refPath.split('#')[0].split('?')[0];
	if (!clean) return null;
	if (clean.startsWith('/')) return path.join(root, clean);
	return path.resolve(path.dirname(fromFile), clean);
}

const root = path.resolve(process.argv[2] || '.');

const htmlFiles = walk(root, ['.html']);
const jsFiles = walk(root, ['.js', '.ts']);

const hrefSrcPattern = /\b(?:href|src)\s*=\s*["']([^"']+)["']/g;
const jsPathPattern = /(?:\.src\s*=\s*|fetch\(|import\(|new Audio\()\s*["']([^"']+)["']/g;

let checked = 0;
let broken = 0;

console.log('== broken link / asset path check ==\n');

function checkFile(file, pattern) {
	const content = fs.readFileSync(file, 'utf8');
	const lines = content.split('\n');
	lines.forEach((line, idx) => {
		pattern.lastIndex = 0;
		let m;
		while ((m = pattern.exec(line))) {
			const ref = m[1];
			if (!isLocalPath(ref)) continue;
			checked++;
			const candidate = resolveCandidate(root, file, ref);
			if (!candidate) continue;
			if (!fs.existsSync(candidate)) {
				broken++;
				console.log(`${path.relative(root, file)}:${idx + 1}  ${ref}`);
				console.log(`  resolved to ${path.relative(root, candidate)} (missing)\n`);
			}
		}
	});
}

htmlFiles.forEach((f) => checkFile(f, hrefSrcPattern));
jsFiles.forEach((f) => checkFile(f, jsPathPattern));

console.log(`checked ${checked} local references, ${broken} broken.`);
