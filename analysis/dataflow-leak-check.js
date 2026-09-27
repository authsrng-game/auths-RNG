'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'archive']);

const OPEN_METHODS = new Set(['setInterval', 'setTimeout', 'requestAnimationFrame']);
const CLOSE_METHODS = new Map([
	['setInterval', 'clearInterval'],
	['setTimeout', 'clearTimeout'],
	['requestAnimationFrame', 'cancelAnimationFrame'],
]);

function walk(dir, out = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (EXCLUDE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full, out);
		else if (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) out.push(full);
	}
	return out;
}

function lineOf(sourceFile, node) {
	return sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
}

function callName(expr) {
	if (ts.isIdentifier(expr)) return { kind: 'plain', name: expr.text, target: null };
	if (ts.isPropertyAccessExpression(expr)) {
		return { kind: 'member', name: expr.name.text, target: expr.expression.getText() };
	}
	return null;
}

function assignedVarName(node) {
	const parent = node.parent;
	if (!parent) return null;
	if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
	if (
		ts.isBinaryExpression(parent) &&
		parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
		parent.right === node
	) {
		return parent.left.getText();
	}
	return null;
}

const root = path.resolve(process.argv[2] || '.');
const files = walk(root);

const addListenerCalls = [];
const removeListenerCalls = [];
const openCalls = [];
const closeCalls = [];

for (const file of files) {
	const text = fs.readFileSync(file, 'utf8');
	const scriptKind = file.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS;
	const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind);

	function visit(node) {
		if (ts.isCallExpression(node)) {
			const info = callName(node.expression);
			if (info) {
				if (
					info.kind === 'member' &&
					info.name === 'addEventListener' &&
					node.arguments.length >= 2
				) {
					const eventArg = node.arguments[0];
					const handlerArg = node.arguments[1];
					const event = ts.isStringLiteral(eventArg) ? eventArg.text : '<dynamic>';
					if (ts.isIdentifier(handlerArg)) {
						addListenerCalls.push({
							file: path.relative(root, file),
							line: lineOf(sourceFile, node),
							target: info.target,
							event,
							handlerKind: 'identifier',
							handlerName: handlerArg.text,
						});
					} else if (ts.isFunctionExpression(handlerArg) || ts.isArrowFunction(handlerArg)) {
						addListenerCalls.push({
							file: path.relative(root, file),
							line: lineOf(sourceFile, node),
							target: info.target,
							event,
							handlerKind: 'inline',
							handlerName: null,
						});
					}
				}

				if (
					info.kind === 'member' &&
					info.name === 'removeEventListener' &&
					node.arguments.length >= 2
				) {
					const eventArg = node.arguments[0];
					const handlerArg = node.arguments[1];
					const event = ts.isStringLiteral(eventArg) ? eventArg.text : '<dynamic>';
					if (ts.isIdentifier(handlerArg)) {
						removeListenerCalls.push({ event, handlerName: handlerArg.text });
					}
				}

				const plainOrMemberName = info.kind === 'plain' ? info.name : info.name;
				if (OPEN_METHODS.has(plainOrMemberName)) {
					const varName = assignedVarName(node);
					openCalls.push({
						file: path.relative(root, file),
						line: lineOf(sourceFile, node),
						method: plainOrMemberName,
						varName,
					});
				}

				const closeTargets = new Set(CLOSE_METHODS.values());
				if (closeTargets.has(plainOrMemberName) && node.arguments.length >= 1) {
					const arg = node.arguments[0];
					if (ts.isIdentifier(arg)) {
						closeCalls.push({ method: plainOrMemberName, argName: arg.text });
					}
				}
			}
		}
		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
}

const neverRemovedIdentifierHandlers = addListenerCalls
	.filter((c) => c.handlerKind === 'identifier')
	.filter(
		(c) =>
			!removeListenerCalls.some(
				(r) =>
					r.handlerName === c.handlerName &&
					(r.event === c.event || c.event === '<dynamic>' || r.event === '<dynamic>')
			)
	);

const anonymousHandlersNeverRemovable = addListenerCalls.filter((c) => c.handlerKind === 'inline');

function neverClosed(openMethod) {
	const closeMethod = CLOSE_METHODS.get(openMethod);
	return openCalls
		.filter((o) => o.method === openMethod)
		.filter((o) => {
			if (!o.varName) return true;
			return !closeCalls.some((c) => c.method === closeMethod && c.argName === o.varName);
		})
		.map((o) => ({
			file: o.file,
			line: o.line,
			varName: o.varName || '<discarded, never captured>',
		}));
}

const result = {
	neverRemovedIdentifierHandlers,
	anonymousHandlersNeverRemovable,
	neverClearedIntervals: neverClosed('setInterval'),
	neverClearedTimeouts: neverClosed('setTimeout'),
	neverCancelledFrames: neverClosed('requestAnimationFrame'),
};

console.log(JSON.stringify(result, null, 2));
