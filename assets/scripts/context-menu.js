(function () {
	'use strict';

	// Every quote here is a real one. The youtube commenter stays, obviously.
	const QUOTES = [
		{
			text: 'I, at any rate, am convinced that He does not throw dice.',
			attr: 'Albert Einstein, 1926',
		},
		{ text: 'A throw of the dice will never abolish chance.', attr: 'Stephane Mallarme' },
		{
			text: 'Anyone who attempts to generate random numbers by deterministic means is, of course, living in a state of sin.',
			attr: 'John von Neumann',
		},
		{
			text: 'Random numbers should not be generated with a method chosen at random.',
			attr: 'Donald Knuth',
		},
		{
			text: 'The generation of random numbers is too important to be left to chance.',
			attr: 'Robert R. Coveyou',
		},
		{ text: 'Chance is only the measure of our ignorance.', attr: 'Henri Poincare' },
		{
			text: 'Chance is a word void of sense; nothing can exist without a cause.',
			attr: 'Voltaire',
		},
		{ text: 'Probability is the very guide of life.', attr: 'Joseph Butler' },
		{ text: 'Life is a school of probability.', attr: 'Walter Bagehot' },
		{
			text: 'It is remarkable that a science which began with the consideration of games of chance should have become the most important object of human knowledge.',
			attr: 'Pierre-Simon Laplace',
		},
		{ text: 'All models are wrong, but some are useful.', attr: 'George Box' },
		{
			text: 'The first principle is that you must not fool yourself, and you are the easiest person to fool.',
			attr: 'Richard Feynman',
		},
		{ text: 'In the long run we are all dead.', attr: 'John Maynard Keynes' },
		{ text: 'Chance favors only the prepared mind.', attr: 'Louis Pasteur' },
		{ text: 'Luck is the residue of design.', attr: 'Branch Rickey' },
		{ text: 'The more I practice, the luckier I get.', attr: 'Gary Player' },
		{
			text: 'Shallow men believe in luck or in circumstance. Strong men believe in cause and effect.',
			attr: 'Ralph Waldo Emerson',
		},
		{ text: 'Fortune favors the bold.', attr: 'Virgil, Aeneid' },
		{ text: 'The dice of Zeus fall ever luckily.', attr: 'Sophocles' },
		{ text: 'Lifetime is a child playing, moving pieces in a game.', attr: 'Heraclitus' },
		{
			text: 'The race is not to the swift, nor the battle to the strong, but time and chance happeneth to them all.',
			attr: 'Ecclesiastes 9:11',
		},
		{
			text: 'I think it may be true that fortune is the arbiter of half our actions, but that she still leaves the other half to be governed by us.',
			attr: 'Niccolo Machiavelli, The Prince',
		},
		{
			text: 'Million-to-one chances crop up nine times out of ten.',
			attr: 'Terry Pratchett, Guards! Guards!',
		},
		{
			text: 'With a large enough sample, outrageous coincidences are likely to occur.',
			attr: 'Diaconis & Mosteller (paraphrased)',
		},
		{ text: 'The best throw of the dice is to throw them away.', attr: 'English proverb' },
		{ text: 'One must imagine Sisyphus happy.', attr: 'Albert Camus' },
		{
			text: 'A journey of a thousand miles begins with a single step.',
			attr: 'Laozi, Tao Te Ching',
		},
		{
			text: 'Ever tried. Ever failed. No matter. Try again. Fail again. Fail better.',
			attr: 'Samuel Beckett, Worstward Ho',
		},
		{ text: "You miss 100% of the shots you don't take.", attr: 'Wayne Gretzky' },
		{
			text: 'I was born into this world crying while everyone smiled, and I will leave this world smiling while everyone cries.',
			attr: 'some random youtube commenter',
		},
	];

	function getDailyQuote() {
		const now = new Date();
		const localDay = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
		return QUOTES[localDay % QUOTES.length];
	}

	// ---- game state readers -------------------------------------------------

	function readNum(key) {
		try {
			const raw = localStorage.getItem(key);
			return raw !== null ? Number(raw) : null;
		} catch {
			return null;
		}
	}

	function readText(id) {
		const el = document.getElementById(id);
		return el ? el.textContent.trim() : '';
	}

	function fmtNum(n) {
		if (n === null || isNaN(n)) return '?';
		if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
		if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
		if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
		return n.toLocaleString();
	}

	function isUsable(id) {
		const el = document.getElementById(id);
		return !!el && !el.disabled;
	}

	function press(id) {
		const el = document.getElementById(id);
		if (el && !el.disabled) el.click();
	}

	function anomalyCount() {
		const m = readText('anomalyCount').match(/\d+/);
		return m ? Number(m[0]) : 0;
	}

	// ---- clipboard / toast --------------------------------------------------

	function copyText(str) {
		const fallback = () => {
			const ta = document.createElement('textarea');
			ta.value = str;
			ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
			document.body.appendChild(ta);
			ta.select();
			document.execCommand('copy');
			ta.remove();
		};
		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard.writeText(str).catch(fallback);
		} else {
			fallback();
		}
	}

	function toast(msg) {
		const t = document.createElement('div');
		t.className = '_ctx-toast';
		t.textContent = msg;
		document.body.appendChild(t);
		setTimeout(() => t.remove(), 1800);
	}

	function copySaveData() {
		press('refreshSaveBtn');
		setTimeout(() => {
			const el = document.getElementById('saveTransferCode');
			const txt = el ? el.textContent.trim() : '';
			if (txt && !txt.includes('(no ')) {
				copyText(txt);
				toast('save data copied');
			} else {
				toast('no save data found');
			}
		}, 80);
	}

	// ---- styles -------------------------------------------------------------

	const style = document.createElement('style');
	style.textContent = `
    @keyframes _ctxIn {
      from { opacity: 0; transform: translateY(-3px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes _ctxToast {
      0%   { opacity: 0; }
      12%  { opacity: 1; }
      80%  { opacity: 1; }
      100% { opacity: 0; }
    }

    #_ctx-menu {
      position: fixed;
      z-index: 2147483645;
      min-width: 190px;
      max-width: 250px;
      max-height: min(80vh, 420px);
      overflow-y: auto;
      background: var(--bg-color, #0e0e0e);
      border: 1px solid var(--border-color, #2a2a2a);
      border-radius: var(--border-radius, 2px);
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.6);
      font-family: monospace;
      font-size: 11px;
      color: var(--text-color, #dcdcdc);
      animation: _ctxIn 0.1s ease both;
      user-select: none;
    }
    #_ctx-menu._ctx-hidden { display: none; }
    body.reduce-motion #_ctx-menu { animation: none; }

    ._ctx-stats {
      padding: 6px 10px;
      font-size: 10px;
      opacity: 0.5;
      border-bottom: 1px solid var(--border-color, #1e1e1e);
      white-space: nowrap;
    }

    ._ctx-sep {
      height: 1px;
      background: var(--border-color, #1e1e1e);
    }

    ._ctx-item {
      padding: 6px 10px;
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      outline: none;
    }
    ._ctx-item:hover,
    ._ctx-item:focus {
      background: var(--button-bg, #1a1a1a);
    }
    ._ctx-item:active {
      background: var(--panel-bg, #222);
    }

    ._ctx-hint {
      float: right;
      margin-left: 12px;
      opacity: 0.35;
      font-size: 10px;
    }

    ._ctx-quote {
      padding: 8px 10px;
      background: var(--overlay-bg, #080808);
      border-top: 1px solid var(--border-color, #1e1e1e);
    }
    ._ctx-quote-text {
      font-size: 10px;
      line-height: 1.5;
      font-style: italic;
      opacity: 0.6;
      white-space: normal;
    }
    ._ctx-quote-attr {
      font-size: 9px;
      opacity: 0.3;
      margin-top: 3px;
      white-space: normal;
    }

    ._ctx-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--panel-bg, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      color: var(--text-color, #dcdcdc);
      font-family: monospace;
      font-size: 12px;
      padding: 6px 14px;
      border-radius: 2px;
      z-index: 2147483646;
      pointer-events: none;
      animation: _ctxToast 1.8s forwards;
    }
  `;
	document.head.appendChild(style);

	const menu = document.createElement('div');
	menu.id = '_ctx-menu';
	menu.setAttribute('role', 'menu');
	menu.classList.add('_ctx-hidden');
	document.body.appendChild(menu);

	// ---- builders -----------------------------------------------------------

	function item(label, onClick, hint) {
		const el = document.createElement('div');
		el.className = '_ctx-item';
		el.setAttribute('role', 'menuitem');
		el.tabIndex = -1;
		el.textContent = label;
		if (hint) {
			const h = document.createElement('span');
			h.className = '_ctx-hint';
			h.textContent = hint;
			el.appendChild(h);
		}
		el.addEventListener('click', () => {
			close();
			onClick();
		});
		return el;
	}

	function sep() {
		const el = document.createElement('div');
		el.className = '_ctx-sep';
		return el;
	}

	function statsLine() {
		const rolls = readNum('totalRolls');
		const pts = readNum('shopPoints');
		const luck = readText('luckMultiplier').replace('luck multiplier:', '').trim();
		const parts = [];
		if (rolls !== null) parts.push(fmtNum(rolls) + ' rolls');
		if (pts !== null) parts.push(fmtNum(pts) + ' pts');
		if (luck) parts.push(luck + ' luck');
		if (!parts.length) return null;
		const el = document.createElement('div');
		el.className = '_ctx-stats';
		el.textContent = parts.join('  /  ');
		return el;
	}

	function quoteBlock(q) {
		const el = document.createElement('div');
		el.className = '_ctx-quote';
		const t = document.createElement('div');
		t.className = '_ctx-quote-text';
		t.textContent = '"' + q.text + '"';
		const a = document.createElement('div');
		a.className = '_ctx-quote-attr';
		a.textContent = '- ' + q.attr;
		el.append(t, a);
		return el;
	}

	// ---- open / close -------------------------------------------------------

	let justOpened = false;

	function close() {
		menu.classList.add('_ctx-hidden');
	}

	function isOpen() {
		return !menu.classList.contains('_ctx-hidden');
	}

	function open(x, y) {
		justOpened = true;
		setTimeout(() => {
			justOpened = false;
		}, 120);

		menu.innerHTML = '';

		const stats = statsLine();
		if (stats) menu.appendChild(stats);

		// Only things that are actually actionable right now, and that
		// aren't reachable from the current page in a click or two.
		const actions = [];
		const sel = window.getSelection ? window.getSelection().toString().trim() : '';

		if (isUsable('rollBtn')) actions.push(item('roll', () => press('rollBtn'), 'space'));

		const auto = document.getElementById('autoRollBtn');
		if (auto) {
			const on = auto.classList.contains('active');
			actions.push(item(on ? 'stop auto roll' : 'start auto roll', () => auto.click()));
		}

		if (isUsable('dailyBtn')) actions.push(item('claim daily', () => press('dailyBtn')));
		if (isUsable('weeklyBtn')) actions.push(item('claim weekly', () => press('weeklyBtn')));

		const anomalies = anomalyCount();
		if (anomalies > 0 && isUsable('consumeAllAnomaliesBtn')) {
			actions.push(
				item('consume anomalies', () => press('consumeAllAnomaliesBtn'), String(anomalies))
			);
		}

		const copies = [];
		if (sel) {
			const preview = sel.length > 16 ? sel.slice(0, 16) + '...' : sel;
			copies.push(
				item(
					'copy selection',
					() => {
						copyText(sel);
						toast('copied');
					},
					preview
				)
			);
		}
		copies.push(item('copy save data', copySaveData));

		const groups = [actions, copies].filter((g) => g.length);
		groups.forEach((g, i) => {
			if (i > 0) menu.appendChild(sep());
			g.forEach((el) => menu.appendChild(el));
		});

		menu.appendChild(quoteBlock(getDailyQuote()));

		// Measure, then clamp to the viewport.
		menu.classList.remove('_ctx-hidden');
		menu.style.left = '0px';
		menu.style.top = '0px';
		const mw = menu.offsetWidth || 220;
		const mh = menu.offsetHeight || 200;
		menu.style.left = Math.max(8, Math.min(x, window.innerWidth - mw - 8)) + 'px';
		menu.style.top = Math.max(8, Math.min(y, window.innerHeight - mh - 8)) + 'px';
	}

	// ---- events -------------------------------------------------------------

	document.addEventListener('contextmenu', (e) => {
		// Shift + right click always gives you the native menu.
		if (e.shiftKey) return;
		if (e.target.closest('input, textarea, select, a, img, video, audio, [contenteditable="true"]'))
			return;
		e.preventDefault();
		open(e.clientX, e.clientY);
	});

	menu.addEventListener('pointerdown', (e) => e.stopPropagation());

	document.addEventListener('pointerdown', () => {
		if (!justOpened) close();
	});

	document.addEventListener('keydown', (e) => {
		if (!isOpen()) return;
		if (e.key === 'Escape') {
			close();
			return;
		}
		if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') return;

		const items = Array.from(menu.querySelectorAll('._ctx-item'));
		if (!items.length) return;
		const idx = items.indexOf(document.activeElement);

		if (e.key === 'Enter') {
			if (idx >= 0) {
				e.preventDefault();
				items[idx].click();
			}
			return;
		}

		e.preventDefault();
		const next =
			e.key === 'ArrowDown'
				? items[(idx + 1) % items.length]
				: items[(idx - 1 + items.length) % items.length];
		next.focus();
	});

	window.addEventListener('scroll', close, { passive: true });
	window.addEventListener('resize', close);
	window.addEventListener('blur', close);
})();
