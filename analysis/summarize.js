'use strict';

const fs = require('fs');
const path = require('path');

const reportDir = path.resolve(process.argv[2] || './analysis/report');
const outFile = path.join(reportDir, 'summary.txt');

const lines = [];
function out(text) {
	lines.push(text);
}

function readJson(file) {
	const full = path.join(reportDir, file);
	if (!fs.existsSync(full)) return null;
	try {
		return JSON.parse(fs.readFileSync(full, 'utf8'));
	} catch {
		return null;
	}
}

function readLog(file) {
	const full = path.join(reportDir, file);
	if (!fs.existsSync(full)) return '';
	return fs.readFileSync(full, 'utf8').trim();
}

function section(title, count) {
	const label = count === 1 ? 'issue' : 'issues';
	out(`\n${title}  (${count} ${label})`);
	out('-'.repeat(title.length + 12));
}

let totalIssues = 0;

const eslint = readJson('eslint.json') || [];
const eslintErrorCount = eslint.reduce((sum, f) => sum + f.errorCount, 0);
const eslintWarnCount = eslint.reduce((sum, f) => sum + f.warningCount, 0);
totalIssues += eslintErrorCount + eslintWarnCount;
section('eslint', eslintErrorCount + eslintWarnCount);
if (eslintErrorCount + eslintWarnCount === 0) {
	out('clean');
} else {
	out(`${eslintErrorCount} errors, ${eslintWarnCount} warnings`);
	eslint
		.filter((f) => f.errorCount + f.warningCount > 0)
		.forEach((f) =>
			out(
				`  ${path.relative(process.cwd(), f.filePath)}  (${f.errorCount} err, ${f.warningCount} warn)`
			)
		);
}

const tsc = readLog('tsc.log');
const tscLines = tsc ? tsc.split('\n').filter((l) => l.includes('error TS')) : [];
totalIssues += tscLines.length;
section('tsc', tscLines.length);
out(tscLines.length === 0 ? 'clean' : tscLines.join('\n'));

const tscCheckJs = readLog('tsc-checkjs.log');
const checkJsLines = tscCheckJs ? tscCheckJs.split('\n').filter((l) => l.includes('error TS')) : [];
totalIssues += checkJsLines.length;
section('tsc checkJs', checkJsLines.length);
out(checkJsLines.length === 0 ? 'clean' : checkJsLines.join('\n'));

const knip = readJson('knip.json');
if (knip) {
	const knipCount = (knip.files || []).length + (knip.issues || []).length;
	totalIssues += knipCount;
	section('knip (unused exports/files)', knipCount);
	out(knipCount === 0 ? 'clean' : JSON.stringify(knip, null, 2));
}

const stylelint = readJson('stylelint.json');
if (stylelint) {
	const styleCount = stylelint.reduce((sum, f) => sum + f.warnings.length, 0);
	totalIssues += styleCount;
	section('stylelint', styleCount);
	if (styleCount === 0) {
		out('clean');
	} else {
		stylelint
			.filter((f) => f.warnings.length > 0)
			.forEach((f) => {
				out(`  ${path.relative(process.cwd(), f.source)}`);
				f.warnings.forEach((w) => out(`    ${w.line}:${w.column}  ${w.text}`));
			});
	}
}

const leaks = readJson('leak-heuristic.json');
if (leaks) {
	const leakCount = leaks.codebaseWide.length + leaks.perFileSuspects.length;
	totalIssues += leakCount;
	section('leak heuristic (pattern based)', leakCount);
	if (leakCount === 0) {
		out('clean');
	} else {
		if (leaks.codebaseWide.length > 0) {
			out('codebase-wide imbalance (open/close counts do not match across the whole tree):');
			leaks.codebaseWide.forEach((l) =>
				out(`  ${l.pair}  opens ${l.opens}, closes ${l.closes}, gap ${l.gap}`)
			);
		}
		if (leaks.perFileSuspects.length > 0) {
			out('single-file suspects (a close call never appears anywhere in this file):');
			leaks.perFileSuspects.forEach((s) => {
				out(`  ${s.file}`);
				s.flags.forEach((f) => out(`    ${f}`));
			});
		}
	}
}

const dataflow = readJson('dataflow-leak.json');
if (!dataflow) {
	section('dataflow leak check (AST based)', 0);
	const stderrLog = readLog('dataflow-leak.stderr.log');
	if (stderrLog) {
		out('DID NOT RUN. error output below, read this before trusting the rest of the report:');
		out(stderrLog);
	} else {
		out(
			'DID NOT RUN, and no stderr log was found either. check that dataflow-leak-check.js was actually invoked in the driver script.'
		);
	}
} else {
	const dataflowCount =
		dataflow.neverRemovedIdentifierHandlers.length +
		dataflow.anonymousHandlersNeverRemovable.length +
		dataflow.neverClearedIntervals.length +
		dataflow.neverClearedTimeouts.length +
		dataflow.neverCancelledFrames.length;
	totalIssues += dataflowCount;
	section('dataflow leak check (AST based)', dataflowCount);
	if (dataflowCount === 0) {
		out('clean');
	} else {
		if (dataflow.neverRemovedIdentifierHandlers.length > 0) {
			out('named handlers added but never passed to a matching remove call:');
			dataflow.neverRemovedIdentifierHandlers.forEach((h) =>
				out(`  ${h.file}:${h.line}  ${h.target}.addEventListener("${h.event}", ${h.handlerName})`)
			);
		}
		if (dataflow.anonymousHandlersNeverRemovable.length > 0) {
			out('inline anonymous handlers, these can never be removed because no reference is kept:');
			dataflow.anonymousHandlersNeverRemovable.forEach((h) =>
				out(`  ${h.file}:${h.line}  ${h.target}.addEventListener("${h.event}", <inline function>)`)
			);
		}
		if (dataflow.neverClearedIntervals.length > 0) {
			out('setInterval results assigned to a variable that is never passed to clearInterval:');
			dataflow.neverClearedIntervals.forEach((h) =>
				out(`  ${h.file}:${h.line}  ${h.varName} = setInterval(...)`)
			);
		}
		if (dataflow.neverClearedTimeouts.length > 0) {
			out('setTimeout results assigned to a variable that is never passed to clearTimeout:');
			dataflow.neverClearedTimeouts.forEach((h) =>
				out(`  ${h.file}:${h.line}  ${h.varName} = setTimeout(...)`)
			);
		}
		if (dataflow.neverCancelledFrames.length > 0) {
			out(
				'requestAnimationFrame results assigned to a variable that is never passed to cancelAnimationFrame:'
			);
			dataflow.neverCancelledFrames.forEach((h) =>
				out(`  ${h.file}:${h.line}  ${h.varName} = requestAnimationFrame(...)`)
			);
		}
	}
}

const methodConsistency = readJson('method-consistency.json');
if (methodConsistency) {
	const count = methodConsistency.flagged.length;
	totalIssues += count;
	section('method name consistency', count);
	if (count === 0) {
		out('clean');
	} else {
		methodConsistency.flagged.forEach((f) => {
			out(
				`  ${f.namespace}.${f.rareMethod}() used ${f.rareMethodUses}x, close to ${f.namespace}.${f.dominantMethod}() used ${f.dominantMethodUses}x (${f.reason})`
			);
			f.rareMethodSites.forEach((s) => out(`    ${s}`));
		});
	}
}

const brokenLinks = readLog('broken-links.txt');
const brokenCount = (brokenLinks.match(/\(missing\)/g) || []).length;
totalIssues += brokenCount;
section('broken links / asset paths', brokenCount);
out(brokenCount === 0 ? 'clean' : brokenLinks);

const tabOut = readJson('tab-out-guard.json');
if (tabOut) {
	const count = tabOut.timerFilesWithNoLocalGuard.length;
	section('tab-out guard', count);
	out(tabOut.note);
	if (count > 0) {
		tabOut.timerFilesWithNoLocalGuard.forEach((f) =>
			out(`  ${f.file}  (setInterval: ${f.setIntervalCount}, rAF: ${f.requestAnimationFrameCount})`)
		);
	}
}

const staleGlobals = readLog('stale-globals.txt');
const staleCount = (staleGlobals.match(/^window\./gm) || []).length;
totalIssues += staleCount;
section('stale window globals', staleCount);
out(staleCount === 0 ? 'clean' : staleGlobals);

out('\n' + '='.repeat(40));
out(`total flagged across all checks: ${totalIssues}`);
out(
	'leak-heuristic, tab-out, stale-globals, and method-consistency are pattern based, not dataflow.'
);
out(
	'dataflow-leak is AST based and resolves identifiers by name within a file, it does not do full scope/binding resolution across closures.'
);
out('false positives happen in every check here. read flagged items, do not trust counts blindly.');

const finalText = lines.join('\n');
fs.writeFileSync(outFile, finalText + '\n');
console.log(finalText);
console.log(`\nwritten to ${outFile}`);
