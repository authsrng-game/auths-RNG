(function () {
	'use strict';

	console.log(performance.now());

	const QUOTES = [
		{ text: 'luck is just probability taken personally.', attr: '— unknown' },
		{ text: 'the rarest drop is the one you stop caring about.', attr: '— some idle game veteran' },
		{ text: 'one more roll.', attr: '— everyone, always' },
		{ text: 'entropy always wins in the end.', attr: '— second law' },
		{
			text: 'a 1-in-a-million chance happens six times a day in a city of six million.',
			attr: '— Diaconis & Mosteller',
		},
		{ text: 'the dice have no memory.', attr: '— Blaise Pascal, probably' },
		{ text: "you miss 100% of the rolls you don't make.", attr: '— wayne gretzky (paraphrased)' },
		{ text: 'probability is not a spectator sport.', attr: '— someone sweating over a gacha' },
		{ text: 'the house always wins. you are the house.', attr: "— wait no you're not" },
		{
			text: "if at first you don't succeed, the sample size is too small.",
			attr: '— statisticians',
		},
		{
			text: 'somewhere, right now, someone rolled the rarest rarity.',
			attr: "— it wasn't you. keep going.",
		},
		{ text: "rng stands for 'really needs grinding'.", attr: '— every mmo player ever' },
		{ text: 'there is no spoon. there is only the roll button.', attr: '— the matrix (abridged)' },
		{
			text: 'even a stopped clock is right twice a day. you are not a stopped clock.',
			attr: '— encouragement?',
		},
		{ text: 'math is just counting really fast. you can do it.', attr: '— auth, probably' },
		{
			text: 'every roll is the first roll if you have bad enough memory.',
			attr: '— coping mechanism #47',
		},
		{ text: 'the expected value is 1. you will feel nothing.', attr: '— probability theory' },
		{ text: 'rng: where skill issue meets fate issue.', attr: '— gacha community wisdom' },
		{ text: 'collect them all. you have time. probably.', attr: '— some game dev' },
		{
			text: 'variance is just the universe trolling you with extra steps.',
			attr: '— statistics, explained badly',
		},
	];

	function getDailyQuote() {
		const day = Math.floor(Date.now() / 86400000);
		return QUOTES[day % QUOTES.length];
	}

	function getCurrentPoints() {
		try {
			const raw = localStorage.getItem('shopPoints');
			return raw !== null ? Number(raw) : null;
		} catch {
			return null;
		}
	}

	function getTotalRolls() {
		try {
			const raw = localStorage.getItem('totalRolls');
			return raw !== null ? Number(raw) : null;
		} catch {
			return null;
		}
	}

	function getLuckMultiplier() {
		const el = document.getElementById('luckMultiplier');
		return el ? el.textContent.replace('luck multiplier:', '').trim() : null;
	}

	function getCollected() {
		const el = document.getElementById('collectedCounter');
		return el ? el.textContent.trim() : null;
	}

	function fmtNum(n) {
		if (n === null || isNaN(n)) return '???';
		if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
		if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
		if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
		return n.toLocaleString();
	}

	function copyText(str) {
		navigator.clipboard.writeText(str).catch(() => {
			const ta = document.createElement('textarea');
			ta.value = str;
			ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
			document.body.appendChild(ta);
			ta.select();
			document.execCommand('copy');
			document.body.removeChild(ta);
		});
	}

	function flashMsg(msg) {
		if (typeof window.showAlert === 'function') {
			window.showAlert(msg);
			return;
		}
		const t = document.createElement('div');
		t.textContent = msg;
		t.style.cssText = `
      position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
      background:var(--panel-bg,#1a1a1a);border:1px solid var(--border-color,#333);color:var(--text-color,#dcdcdc);
      font-family:monospace;font-size:0.8em;padding:6px 14px;
      border-radius:2px;z-index:2147483646;pointer-events:none;
      animation:_ctxFlash 2s forwards;
    `;
		document.body.appendChild(t);
		setTimeout(() => t.remove(), 2000);
	}

	const style = document.createElement('style');
	style.textContent = `
    @keyframes _ctxIn {
      from { opacity:0; transform:scale(0.94) translateY(-4px); }
      to   { opacity:1; transform:scale(1)    translateY(0);    }
    }
    @keyframes _ctxFlash {
      0%   { opacity:0; }
      10%  { opacity:1; }
      80%  { opacity:1; }
      100% { opacity:0; }
    }

    #_ctx-menu {
      position: fixed;
      z-index: 2147483645;
      min-width: 200px;
      max-width: 260px;
      max-height: min(80vh, 480px);
      overflow-y: auto;
      overflow-x: hidden;
      background: var(--bg-color, #0e0e0e);
      border: 1px solid var(--border-color, #2a2a2a);
      border-radius: var(--border-radius, 2px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5);
      font-family: monospace;
      font-size: 11px;
      color: var(--text-color, #dcdcdc);
      animation: _ctxIn 0.12s ease both;
      user-select: none;
    }

    #_ctx-menu._ctx-hidden {
      display: none;
    }

    ._ctx-header {
      padding: 5px 10px 4px;
      font-size: 9px;
      letter-spacing: 0.12em;
      opacity: 0.35;
      text-transform: uppercase;
      border-bottom: 1px solid var(--border-color, #1e1e1e);
    }

    ._ctx-sep {
      height: 1px;
      background: var(--border-color, #1e1e1e);
      margin: 1px 0;
    }

    ._ctx-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 10px;
      cursor: pointer;
      transition: background 0.08s;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    ._ctx-item:hover {
      background: var(--button-bg, #1a1a1a);
    }

    ._ctx-item:active {
      background: var(--panel-bg, #222);
    }

    ._ctx-item._ctx-disabled {
      opacity: 0.28;
      cursor: not-allowed;
      pointer-events: none;
    }

    ._ctx-item._ctx-danger:hover {
      background: #1a0a0a;
      color: #ff6b6b;
    }

    ._ctx-icon {
      font-size: 12px;
      width: 14px;
      text-align: center;
      flex-shrink: 0;
    }

    ._ctx-label {
      flex: 1;
    }

    ._ctx-badge {
      font-size: 9px;
      opacity: 0.4;
      flex-shrink: 0;
    }

    ._ctx-stat-block {
      padding: 5px 10px 6px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px 8px;
      background: var(--overlay-bg, #080808);
      border-bottom: 1px solid var(--border-color, #1e1e1e);
    }

    ._ctx-stat {
      font-size: 9px;
    }

    ._ctx-stat-label {
      opacity: 0.4;
    }

    ._ctx-stat-val {
      opacity: 0.85;
    }

    ._ctx-quote-block {
      padding: 6px 10px;
      background: var(--overlay-bg, #080808);
      border-top: 1px solid var(--border-color, #1e1e1e);
    }

    ._ctx-quote-text {
      font-size: 9px;
      opacity: 0.55;
      line-height: 1.5;
      font-style: italic;
      white-space: normal;
    }

    ._ctx-quote-attr {
      font-size: 8px;
      opacity: 0.3;
      margin-top: 3px;
    }

    ._ctx-qotd-label {
      font-size: 8px;
      opacity: 0.25;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
  `;
	document.head.appendChild(style);

	const menu = document.createElement('div');
	menu.id = '_ctx-menu';
	menu.classList.add('_ctx-hidden');
	document.body.appendChild(menu);

	function makeItem(icon, label, badge, onClick, opts = {}) {
		console.log('[ctx-menu] item created:', label, opts);
		const el = document.createElement('div');
		el.className =
			'_ctx-item' + (opts.disabled ? ' _ctx-disabled' : '') + (opts.danger ? ' _ctx-danger' : '');
		el.innerHTML = `
      <span class="_ctx-icon">${icon}</span>
      <span class="_ctx-label">${label}</span>
      ${badge ? `<span class="_ctx-badge">${badge}</span>` : ''}
    `;
		if (!opts.disabled && onClick)
			el.addEventListener('click', () => {
				close();
				onClick();
			});
		return el;
	}

	function makeHeader(text) {
		const el = document.createElement('div');
		el.className = '_ctx-header';
		el.textContent = text;
		return el;
	}

	function makeSep() {
		const el = document.createElement('div');
		el.className = '_ctx-sep';
		return el;
	}

	function makeStatBlock(stats) {
		const el = document.createElement('div');
		el.className = '_ctx-stat-block';
		stats.forEach(([label, val]) => {
			const s = document.createElement('div');
			s.className = '_ctx-stat';
			s.innerHTML = `<span class="_ctx-stat-label">${label}</span> <span class="_ctx-stat-val">${val}</span>`;
			el.appendChild(s);
		});
		return el;
	}

	function makeQuoteBlock(quote) {
		const el = document.createElement('div');
		el.className = '_ctx-quote-block';
		el.innerHTML = `
      <div class="_ctx-qotd-label">quote of the day</div>
      <div class="_ctx-quote-text">"${quote.text}"</div>
      <div class="_ctx-quote-attr">${quote.attr}</div>
    `;
		return el;
	}

	let _justOpened = false;

	function close() {
		menu.classList.add('_ctx-hidden');
		console.log('[ctx-menu] closed');
	}

	function open(x, y) {
		console.log('[ctx-menu] open triggered', { x, y });
		_justOpened = true;
		setTimeout(() => {
			_justOpened = false;
		}, 120);

		menu.classList.remove('_ctx-hidden');
		menu.innerHTML = '';

		const pts = getCurrentPoints();
		const rolls = getTotalRolls();
		const luck = getLuckMultiplier();
		const coll = getCollected();
		const currentPageIdx = typeof window._currentPage !== 'undefined' ? window._currentPage : -1;

		const pageNames = [
			'roll',
			'shop',
			'gauntlets',
			'mutations',
			'starmap',
			'runes',
			'wishing well',
			'settings',
			'links',
		];

		const now = new Date();
		const timeStr = now.toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		});
		const dateStr = now.toLocaleDateString([], {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
		});

		const statData = [];
		if (rolls !== null) statData.push(['rolls', fmtNum(rolls)]);
		if (pts !== null) statData.push(['points', fmtNum(pts)]);
		if (luck) statData.push(['luck', luck]);
		if (coll) statData.push(['index', coll]);
		statData.push(['time', timeStr]);
		statData.push(['date', dateStr]);

		if (statData.length) menu.appendChild(makeStatBlock(statData));

		menu.appendChild(makeHeader('navigate'));

		pageNames.forEach((name, i) => {
			const locked = window.lockedPages && window.lockedPages.has(i);
			const isCurrent = i === currentPageIdx;
			menu.appendChild(
				makeItem(
					isCurrent ? '▶' : '·',
					name,
					locked ? 'locked' : isCurrent ? 'here' : '',
					() => {
						if (typeof window.goToPage === 'function') window.goToPage(i);
					},
					{ disabled: locked }
				)
			);
		});

		makeSep() && menu.appendChild(makeSep());

		menu.appendChild(makeHeader('actions'));

		menu.appendChild(
			makeItem('🎲', 'roll now', '', () => {
				const btn = document.getElementById('rollBtn');
				if (btn && !btn.disabled) btn.click();
				else flashMsg('roll is on cooldown!');
			})
		);

		menu.appendChild(
			makeItem('📅', 'claim daily', '', () => {
				const btn = document.getElementById('dailyBtn');
				if (btn && !btn.disabled) btn.click();
				else flashMsg('daily already claimed!');
			})
		);

		const autoBtn = document.getElementById('autoRollBtn');
		const autoOn = autoBtn && autoBtn.classList.contains('active');
		menu.appendChild(
			makeItem(autoOn ? '⏸' : '▶', autoOn ? 'stop auto roll' : 'start auto roll', '', () => {
				const b = document.getElementById('autoRollBtn');
				if (b) b.click();
			})
		);

		menu.appendChild(makeSep());

		menu.appendChild(
			makeItem('⚗️', 'consume anomaly', '', () => {
				const btn = document.getElementById('consumeAnomalyBtn');
				if (btn) btn.click();
				else flashMsg('no anomaly button found');
			})
		);

		menu.appendChild(
			makeItem('📖', 'view rarity index', '', () => {
				const btn = document.getElementById('indexBtn');
				if (btn) btn.click();
			})
		);

		menu.appendChild(
			makeItem('🪄', 'throw 100pts in well', '', () => {
				if (typeof window.setWellAmount === 'function') window.setWellAmount(100);
				if (typeof window.goToPage === 'function') window.goToPage(6);
				const btn = document.getElementById('throwWellBtn');
				if (btn) setTimeout(() => btn.click(), 150);
			})
		);

		makeSep() && menu.appendChild(makeSep());

		menu.appendChild(makeHeader('copy'));

		menu.appendChild(
			makeItem('💾', 'copy save data', '', () => {
				const el = document.getElementById('saveTransferCode');
				if (el && el.textContent && !el.textContent.includes('(no ')) {
					copyText(el.textContent);
					flashMsg('save data copied!');
				} else {
					const refreshBtn = document.getElementById('refreshSaveBtn');
					if (refreshBtn) refreshBtn.click();
					setTimeout(() => {
						const el2 = document.getElementById('saveTransferCode');
						if (el2 && el2.textContent && !el2.textContent.includes('(no ')) {
							copyText(el2.textContent);
							flashMsg('save data copied!');
						} else {
							flashMsg('no save data found');
						}
					}, 80);
				}
			})
		);

		menu.appendChild(
			makeItem('🔗', 'copy page url', '', () => {
				copyText(location.href);
				flashMsg('url copied!');
			})
		);

		if (pts !== null) {
			menu.appendChild(
				makeItem('📋', 'copy stats snapshot', '', () => {
					const snap = [
						`auth's RNG stats @ ${dateStr} ${timeStr}`,
						`rolls:  ${fmtNum(rolls)}`,
						`points: ${fmtNum(pts)}`,
						`luck:   ${luck || '?'}`,
						`index:  ${coll || '?'}`,
					].join('\n');
					copyText(snap);
					flashMsg('stats copied!');
				})
			);
		}

		menu.appendChild(makeSep());

		const sel = window.getSelection ? window.getSelection().toString().trim() : '';
		if (sel) {
			menu.appendChild(makeHeader('selection'));
			menu.appendChild(
				makeItem(
					'📋',
					'copy selection',
					`"${sel.slice(0, 18)}${sel.length > 18 ? '…' : ''}"`,
					() => {
						copyText(sel);
						flashMsg('copied!');
					}
				)
			);
			menu.appendChild(makeSep());
		}

		menu.appendChild(makeHeader('page'));

		menu.appendChild(makeItem('↺', 'reload game', '', () => location.reload()));

		menu.appendChild(
			makeItem('📰', 'open github', '', () => {
				window.open('https://github.com/auth1ery/auths-RNG', '_blank');
			})
		);

		menu.appendChild(
			makeItem('💬', 'open discord', '', () => {
				window.open('https://discord.gg/mTDw8jJYqX', '_blank');
			})
		);

		menu.appendChild(
			makeItem('❓', 'open faq', '', () => {
				window.open('/FAQ.html', '_blank');
			})
		);

		menu.appendChild(makeSep());

		menu.appendChild(makeQuoteBlock(getDailyQuote()));

		menu.style.left = '0';
		menu.style.top = '0';
		const mw = menu.offsetWidth || 220;
		const mh = menu.offsetHeight || 300;
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		menu.style.left = Math.min(x, vw - mw - 8) + 'px';
		menu.style.top = Math.min(y, vh - mh - 8) + 'px';
	}

	menu.addEventListener('pointerdown', (e) => {
		e.stopPropagation();
	});

	document.addEventListener('contextmenu', (e) => {
		e.preventDefault();
		open(e.clientX, e.clientY);
	});

	document.addEventListener('pointerdown', (e) => {
		if (_justOpened) console.log('[ctx-menu] ignored pointerdown (just opened)');
		close();
	});

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') close();
	});
})();
