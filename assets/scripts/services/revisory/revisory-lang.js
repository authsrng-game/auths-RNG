'use strict';

window.RevisoryLang = (function () {
	function tokenize(src) {
		const tokens = [];
		let i = 0;
		const n = src.length;
		const isDigit = (c) => c >= '0' && c <= '9';
		const isIdentStart = (c) => /[a-zA-Z_]/.test(c);
		const isIdentPart = (c) => /[a-zA-Z0-9_]/.test(c);

		while (i < n) {
			const c = src[i];
			if (c === ' ' || c === '\t' || c === '\r') {
				i++;
				continue;
			}
			if (c === '\n' || c === ';') {
				tokens.push({ type: 'nl' });
				i++;
				continue;
			}
			if (c === '#') {
				while (i < n && src[i] !== '\n') i++;
				continue;
			}
			if (c === '"' || c === "'") {
				const q = c;
				let j = i + 1;
				let buf = '';
				while (j < n && src[j] !== q) {
					if (src[j] === '\\' && j + 1 < n) {
						buf += src[j + 1];
						j += 2;
						continue;
					}
					buf += src[j];
					j++;
				}
				tokens.push({ type: 'string', value: buf });
				i = j + 1;
				continue;
			}
			if (isDigit(c) || (c === '-' && isDigit(src[i + 1]))) {
				let j = i + 1;
				while (j < n && (isDigit(src[j]) || src[j] === '.')) j++;
				tokens.push({ type: 'number', value: parseFloat(src.slice(i, j)) });
				i = j;
				continue;
			}
			if (c === '$') {
				let j = i + 1;
				let buf = '';
				while (j < n && isIdentPart(src[j])) {
					buf += src[j];
					j++;
				}
				tokens.push({ type: 'var', value: buf });
				i = j;
				continue;
			}
			if (isIdentStart(c)) {
				let j = i;
				let buf = '';
				while (j < n && isIdentPart(src[j])) {
					buf += src[j];
					j++;
				}
				const keywords = [
					'if',
					'else',
					'while',
					'for',
					'in',
					'func',
					'return',
					'true',
					'false',
					'null',
				];
				tokens.push({ type: keywords.includes(buf) ? buf : 'ident', value: buf });
				i = j;
				continue;
			}
			const two = src.slice(i, i + 2);
			if (['==', '!=', '<=', '>=', '&&', '||'].includes(two)) {
				tokens.push({ type: 'op', value: two });
				i += 2;
				continue;
			}
			if ('+-*/%()[]{},.<>!=|'.includes(c)) {
				tokens.push({ type: 'op', value: c });
				i++;
				continue;
			}
			throw new Error('unexpected character: ' + JSON.stringify(c));
		}
		tokens.push({ type: 'eof' });
		return tokens;
	}

	function parse(tokens) {
		let pos = 0;
		function peek(offset) {
			return tokens[pos + (offset || 0)];
		}
		function at(type, value) {
			const t = peek();
			return t.type === type && (value === undefined || t.value === value);
		}
		function advance() {
			return tokens[pos++];
		}
		function expect(type, value) {
			if (!at(type, value)) {
				throw new Error(
					'expected ' + type + (value ? ' ' + value : '') + ' but got ' + JSON.stringify(peek())
				);
			}
			return advance();
		}
		function skipNl() {
			while (at('nl')) advance();
		}

		function parseProgram() {
			const stmts = [];
			skipNl();
			while (!at('eof')) {
				stmts.push(parseStatement());
				skipNl();
			}
			return { type: 'Program', body: stmts };
		}

		function parseBlock() {
			expect('op', '{');
			skipNl();
			const stmts = [];
			while (!at('op', '}')) {
				stmts.push(parseStatement());
				skipNl();
			}
			expect('op', '}');
			return { type: 'Block', body: stmts };
		}

		function parseStatement() {
			if (at('if')) return parseIf();
			if (at('while')) return parseWhile();
			if (at('for')) return parseFor();
			if (at('func')) return parseFunc();
			if (at('return')) {
				advance();
				let arg = null;
				if (!at('nl') && !at('eof') && !at('op', '}')) arg = parseExpr();
				return { type: 'Return', argument: arg };
			}
			if (at('var') && peek(1).type === 'op' && peek(1).value === '=') {
				const name = advance().value;
				advance();
				const value = parseExpr();
				return { type: 'Assign', name, value };
			}
			const expr = parseExpr();
			return { type: 'ExprStmt', expr };
		}

		function parseIf() {
			advance();
			expect('op', '(');
			const test = parseExpr();
			expect('op', ')');
			skipNl();
			const consequent = parseBlock();
			skipNl();
			let alternate = null;
			if (at('else')) {
				advance();
				skipNl();
				alternate = at('if') ? parseIf() : parseBlock();
			}
			return { type: 'If', test, consequent, alternate };
		}

		function parseWhile() {
			advance();
			expect('op', '(');
			const test = parseExpr();
			expect('op', ')');
			skipNl();
			const body = parseBlock();
			return { type: 'While', test, body };
		}

		function parseFor() {
			advance();
			const varName = expect('var').value;
			expect('in');
			const iterable = parseExpr();
			skipNl();
			const body = parseBlock();
			return { type: 'For', varName, iterable, body };
		}

		function parseFunc() {
			advance();
			const name = expect('ident').value;
			expect('op', '(');
			const params = [];
			while (!at('op', ')')) {
				params.push(expect('var').value);
				if (at('op', ',')) advance();
			}
			expect('op', ')');
			skipNl();
			const body = parseBlock();
			return { type: 'FuncDef', name, params, body };
		}

		function parseExpr() {
			return parsePipe();
		}

		function parsePipe() {
			let left = parseOr();
			while (at('op', '|')) {
				advance();
				const call = parseOr();
				if (call.type !== 'Call') throw new Error('right side of | must be a function call');
				call.args.unshift(left);
				left = call;
			}
			return left;
		}

		function parseOr() {
			let left = parseAnd();
			while (at('op', '||')) {
				advance();
				left = { type: 'Logical', op: '||', left, right: parseAnd() };
			}
			return left;
		}

		function parseAnd() {
			let left = parseEquality();
			while (at('op', '&&')) {
				advance();
				left = { type: 'Logical', op: '&&', left, right: parseEquality() };
			}
			return left;
		}

		function parseEquality() {
			let left = parseComparison();
			while (at('op', '==') || at('op', '!=')) {
				const op = advance().value;
				left = { type: 'Binary', op, left, right: parseComparison() };
			}
			return left;
		}

		function parseComparison() {
			let left = parseAdditive();
			while (at('op', '<') || at('op', '>') || at('op', '<=') || at('op', '>=')) {
				const op = advance().value;
				left = { type: 'Binary', op, left, right: parseAdditive() };
			}
			return left;
		}

		function parseAdditive() {
			let left = parseMultiplicative();
			while (at('op', '+') || at('op', '-')) {
				const op = advance().value;
				left = { type: 'Binary', op, left, right: parseMultiplicative() };
			}
			return left;
		}

		function parseMultiplicative() {
			let left = parseUnary();
			while (at('op', '*') || at('op', '/') || at('op', '%')) {
				const op = advance().value;
				left = { type: 'Binary', op, left, right: parseUnary() };
			}
			return left;
		}

		function parseUnary() {
			if (at('op', '!') || at('op', '-')) {
				const op = advance().value;
				return { type: 'Unary', op, argument: parseUnary() };
			}
			return parsePostfix();
		}

		function parsePostfix() {
			let expr = parsePrimary();
			for (;;) {
				if (at('op', '(') && expr.type === 'Ident') {
					advance();
					const args = [];
					while (!at('op', ')')) {
						args.push(parseExpr());
						if (at('op', ',')) advance();
					}
					expect('op', ')');
					expr = { type: 'Call', callee: expr.name, args };
					continue;
				}
				if (at('op', '[')) {
					advance();
					const index = parseExpr();
					expect('op', ']');
					expr = { type: 'Index', object: expr, index };
					continue;
				}
				if (at('op', '.')) {
					advance();
					const prop = expect('ident').value;
					expr = { type: 'Member', object: expr, prop };
					continue;
				}
				break;
			}
			return expr;
		}

		function parsePrimary() {
			if (at('number')) return { type: 'Literal', value: advance().value };
			if (at('string')) return { type: 'Literal', value: advance().value };
			if (at('true')) {
				advance();
				return { type: 'Literal', value: true };
			}
			if (at('false')) {
				advance();
				return { type: 'Literal', value: false };
			}
			if (at('null')) {
				advance();
				return { type: 'Literal', value: null };
			}
			if (at('var')) return { type: 'Var', name: advance().value };
			if (at('ident')) return { type: 'Ident', name: advance().value };
			if (at('op', '(')) {
				advance();
				const e = parseExpr();
				expect('op', ')');
				return e;
			}
			if (at('op', '[')) {
				advance();
				const items = [];
				while (!at('op', ']')) {
					items.push(parseExpr());
					if (at('op', ',')) advance();
				}
				expect('op', ']');
				return { type: 'ArrayLit', items };
			}
			throw new Error('unexpected token: ' + JSON.stringify(peek()));
		}

		return parseProgram();
	}

	class Scope {
		constructor(parent) {
			this.vars = Object.create(null);
			this.parent = parent || null;
		}
		get(name) {
			if (name in this.vars) return this.vars[name];
			if (this.parent) return this.parent.get(name);
			return undefined;
		}
		set(name, value) {
			let s = this;
			while (s) {
				if (name in s.vars) {
					s.vars[name] = value;
					return;
				}
				s = s.parent;
			}
			this.vars[name] = value;
		}
		declareLocal(name, value) {
			this.vars[name] = value;
		}
	}

	class ReturnSignal {
		constructor(value) {
			this.value = value;
		}
	}

	function truthy(v) {
		return !!v;
	}

	async function evalNode(node, scope, funcs, builtins) {
		switch (node.type) {
			case 'Program': {
				let last = undefined;
				for (const stmt of node.body) last = await evalNode(stmt, scope, funcs, builtins);
				return last;
			}
			case 'Block': {
				let last = undefined;
				for (const stmt of node.body) last = await evalNode(stmt, scope, funcs, builtins);
				return last;
			}
			case 'ExprStmt':
				return evalNode(node.expr, scope, funcs, builtins);
			case 'Assign': {
				const value = await evalNode(node.value, scope, funcs, builtins);
				scope.set(node.name, value);
				return value;
			}
			case 'If': {
				const test = await evalNode(node.test, scope, funcs, builtins);
				if (truthy(test)) return evalNode(node.consequent, scope, funcs, builtins);
				if (node.alternate) return evalNode(node.alternate, scope, funcs, builtins);
				return undefined;
			}
			case 'While': {
				let guard = 0;
				while (truthy(await evalNode(node.test, scope, funcs, builtins))) {
					if (++guard > 1000000) throw new Error('while loop exceeded iteration limit');
					await evalNode(node.body, scope, funcs, builtins);
				}
				return undefined;
			}
			case 'For': {
				const iterable = await evalNode(node.iterable, scope, funcs, builtins);
				const arr = Array.isArray(iterable) ? iterable : Object.keys(iterable || {});
				for (const item of arr) {
					const childScope = new Scope(scope);
					childScope.declareLocal(node.varName, item);
					await evalNode(node.body, childScope, funcs, builtins);
				}
				return undefined;
			}
			case 'FuncDef':
				funcs[node.name] = { params: node.params, body: node.body, closure: scope };
				return undefined;
			case 'Return':
				throw new ReturnSignal(
					node.argument ? await evalNode(node.argument, scope, funcs, builtins) : undefined
				);
			case 'Literal':
				return node.value;
			case 'ArrayLit': {
				const out = [];
				for (const it of node.items) out.push(await evalNode(it, scope, funcs, builtins));
				return out;
			}
			case 'Var':
				return scope.get(node.name);
			case 'Ident':
				return node.name;
			case 'Index': {
				const obj = await evalNode(node.object, scope, funcs, builtins);
				const idx = await evalNode(node.index, scope, funcs, builtins);
				return obj == null ? undefined : obj[idx];
			}
			case 'Member': {
				const obj = await evalNode(node.object, scope, funcs, builtins);
				return obj == null ? undefined : obj[node.prop];
			}
			case 'Unary': {
				const v = await evalNode(node.argument, scope, funcs, builtins);
				if (node.op === '!') return !truthy(v);
				if (node.op === '-') return -v;
				break;
			}
			case 'Logical': {
				const left = await evalNode(node.left, scope, funcs, builtins);
				if (node.op === '&&')
					return truthy(left) ? evalNode(node.right, scope, funcs, builtins) : left;
				return truthy(left) ? left : evalNode(node.right, scope, funcs, builtins);
			}
			case 'Binary': {
				const l = await evalNode(node.left, scope, funcs, builtins);
				const r = await evalNode(node.right, scope, funcs, builtins);
				switch (node.op) {
					case '+':
						return typeof l === 'string' || typeof r === 'string' ? String(l) + String(r) : l + r;
					case '-':
						return l - r;
					case '*':
						return l * r;
					case '/':
						return l / r;
					case '%':
						return l % r;
					case '==':
						return l === r;
					case '!=':
						return l !== r;
					case '<':
						return l < r;
					case '>':
						return l > r;
					case '<=':
						return l <= r;
					case '>=':
						return l >= r;
				}
				break;
			}
			case 'Call': {
				const args = [];
				for (const a of node.args) args.push(await evalNode(a, scope, funcs, builtins));
				if (funcs[node.callee]) {
					const fn = funcs[node.callee];
					const callScope = new Scope(fn.closure);
					fn.params.forEach((p, i) => callScope.declareLocal(p, args[i]));
					try {
						await evalNode(fn.body, callScope, funcs, builtins);
						return undefined;
					} catch (sig) {
						if (sig instanceof ReturnSignal) return sig.value;
						throw sig;
					}
				}
				if (typeof builtins[node.callee] === 'function') {
					return builtins[node.callee](...args);
				}
				throw new Error('unknown function: ' + node.callee);
			}
		}
		throw new Error('cannot evaluate node type: ' + node.type);
	}

	async function run(source, builtins, scope, funcs) {
		const tokens = tokenize(source);
		const ast = parse(tokens);
		const rootScope = scope || new Scope(null);
		const fns = funcs || Object.create(null);
		try {
			return await evalNode(ast, rootScope, fns, builtins);
		} catch (sig) {
			if (sig instanceof ReturnSignal) return sig.value;
			throw sig;
		}
	}

	return { run, tokenize, parse, Scope };
})();
