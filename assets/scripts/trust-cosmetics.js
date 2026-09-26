// oh boy oh boy

(function () {
	'use strict';

	console.log(performance.now());

	const TRUST_KEY = 'mutationTrust';
	const TRUST_OWNED_KEY = 'mutationTrustOwned';
	const TRUST_ACTIVE_KEY = 'mutationTrustActive';

	const COSMETICS = [
		{
			id: 'frame_signal',
			cat: 'frame',
			name: 'signal',
			cost: 80,
			desc: 'corner bracket marks',
		},
		{
			id: 'frame_neon',
			cat: 'frame',
			name: 'neon pulse',
			cost: 200,
			desc: 'animated neon border',
		},
		{
			id: 'frame_aurora',
			cat: 'frame',
			name: 'aurora',
			cost: 400,
			desc: 'shifting color border',
		},
		{
			id: 'frame_void',
			cat: 'frame',
			name: 'void',
			cost: 650,
			desc: 'dark vignette pulse',
		},
		{
			id: 'trail_sparkle',
			cat: 'trail',
			name: 'sparkle',
			cost: 150,
			desc: 'glittery cursor trail',
		},
		{
			id: 'trail_comet',
			cat: 'trail',
			name: 'comet',
			cost: 300,
			desc: 'comet tail',
		},
		{
			id: 'trail_static',
			cat: 'trail',
			name: 'static',
			cost: 500,
			desc: 'tv static trail',
		},
		{
			id: 'click_ripple',
			cat: 'click',
			name: 'ripple',
			cost: 100,
			desc: 'ripple on click/tap',
		},
		{
			id: 'click_burst',
			cat: 'click',
			name: 'burst',
			cost: 250,
			desc: 'particle burst',
		},
		{
			id: 'click_shatter',
			cat: 'click',
			name: 'shatter',
			cost: 450,
			desc: 'shard explosion',
		},
	];

	const UPGRADES = [
		{
			id: 'upgrade_automutate',
			name: 'auto-mutate',
			cost: 15,
			desc: 'automatically mutates random rarities every 20s',
		},
	];

	const CAT_LABELS = {
		frame: '🖼 frames',
		trail: '✨ trails',
		click: '💥 click effects',
	};

	function getTrust() {
		return parseInt(localStorage.getItem(TRUST_KEY) || '0');
	}
	function setTrust(v) {
		localStorage.setItem(TRUST_KEY, String(Math.max(0, v)));
	}
	function getOwned() {
		try {
			return JSON.parse(localStorage.getItem(TRUST_OWNED_KEY) || '[]');
		} catch {
			return [];
		}
	}
	function getActive() {
		try {
			return JSON.parse(localStorage.getItem(TRUST_ACTIVE_KEY) || '{}');
		} catch {
			return {};
		}
	}
	function saveOwned(o) {
		localStorage.setItem(TRUST_OWNED_KEY, JSON.stringify(o));
	}
	function saveActive(a) {
		localStorage.setItem(TRUST_ACTIVE_KEY, JSON.stringify(a));
	}

	function buy(id) {
		const item = COSMETICS.find((c) => c.id === id);
		if (!item) return false;
		const owned = getOwned();
		if (owned.includes(id)) return false;
		if (getTrust() < item.cost) return false;
		setTrust(getTrust() - item.cost);
		owned.push(id);
		saveOwned(owned);
		return true;
	}

	function equip(id) {
		const item = COSMETICS.find((c) => c.id === id);
		if (!item || !getOwned().includes(id)) return;
		const active = getActive();
		active[item.cat] = id;
		saveActive(active);
		applyCosmetic(item.cat, id);
	}

	function unequip(cat) {
		const active = getActive();
		delete active[cat];
		saveActive(active);
		applyCosmetic(cat, null);
	}

	function applyCosmetic(cat, id) {
		if (cat === 'frame') applyFrame(id);
		if (cat === 'trail') initTrail(id);
		if (cat === 'click') activeClick = id;
	}

	function applyFrame(id) {
		let el = document.getElementById('trust-frame');
		if (!el) {
			el = document.createElement('div');
			el.id = 'trust-frame';
			document.body.appendChild(el);
		}
		el.className = id || '';
	}

	let trailCleanup = null;

	function startAutoMutate() {
		if (!getOwned().includes('upgrade_automutate')) return;
		setInterval(() => {
			const inv = window.getInventoryRarities?.();
			if (!inv || inv.length < 2) return;
			const shuffle = [...inv].sort(
				() => (typeof Beacon !== 'undefined' ? Beacon.float() : Math.random()) - 0.5
			);
			const a = shuffle[0];
			const b = shuffle[1];
			if (a.name === b.name) return;
			const result = mutate(a.name, b.name);
			if (!result) return;
			const idxA = getRarityIndex(a.name);
			const idxB = getRarityIndex(b.name);
			const resultIdx = getRarityIndex(result.name);
			const wasGood = resultIdx < Math.min(idxA, idxB);
			const trustDelta = getTrustDelta(wasGood, resultIdx, idxA, idxB);
			addTrust(trustDelta);
			addToHistory(a.name, b.name, result, wasGood);
			renderHistory();
			renderTrustBalance();
			if (typeof addToInventory === 'function') addToInventory(result);
			if (typeof saveAllData === 'function') saveAllData();
		}, 20000);
	}

	function initTrail(id) {
		if (trailCleanup) {
			trailCleanup();
			trailCleanup = null;
		}
		const prev = document.getElementById('trust-trail-canvas');
		if (prev) prev.remove();
		if (!id) return;

		const canvas = document.createElement('canvas');
		canvas.id = 'trust-trail-canvas';
		canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9985;';
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		document.body.appendChild(canvas);

		const ctx = canvas.getContext('2d');
		const particles = [];
		let mx = -999,
			my = -999,
			lx = -999,
			ly = -999;
		let rafId,
			frameN = 0;
		const isMobile = window.matchMedia('(pointer: coarse)').matches;

		const onMouse = (e) => {
			mx = e.clientX;
			my = e.clientY;
		};
		const onTouch = (e) => {
			mx = e.touches[0].clientX;
			my = e.touches[0].clientY;
		};
		const onResize = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		};

		window.addEventListener('mousemove', onMouse);
		window.addEventListener('touchmove', onTouch, { passive: true });
		window.addEventListener('resize', onResize);

		function spawn(x, y) {
			if (id === 'trail_sparkle') {
				particles.push({
					x,
					y,
					vx: (Math.random() - 0.5) * 1.6,
					vy: (Math.random() - 0.5) * 1.6 - 0.4,
					life: 1,
					size: Math.random() * 2.5 + 1,
					hue: Math.random() * 60 + 190,
				});
			} else if (id === 'trail_comet') {
				particles.push({
					x,
					y,
					vx: 0,
					vy: 0,
					life: 1,
					size: 3 + Math.random() * 2.5,
				});
			} else if (id === 'trail_static') {
				for (let i = 0; i < 4; i++) {
					particles.push({
						x: x + (Math.random() - 0.5) * 14,
						y: y + (Math.random() - 0.5) * 14,
						vx: (Math.random() - 0.5) * 0.5,
						vy: (Math.random() - 0.5) * 0.5,
						life: 1,
						size: Math.random() * 2 + 0.5,
						bright: Math.random() > 0.5,
					});
				}
			}
		}

		function tick() {
			rafId = requestAnimationFrame(tick);
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			frameN++;

			if (frameN % 2 === 0) {
				const dx = mx - lx,
					dy = my - ly;
				if (dx * dx + dy * dy > (isMobile ? 2 : 9)) {
					spawn(mx, my);
					lx = mx;
					ly = my;
				}
			}

			const decay = id === 'trail_comet' ? 0.032 : id === 'trail_static' ? 0.09 : 0.055;

			for (let i = particles.length - 1; i >= 0; i--) {
				const p = particles[i];
				p.x += p.vx;
				p.y += p.vy;
				p.life -= decay;
				if (p.life <= 0) {
					particles.splice(i, 1);
					continue;
				}
				ctx.globalAlpha = p.life;

				if (id === 'trail_sparkle') {
					ctx.fillStyle = `hsl(${p.hue},100%,76%)`;
					const s = p.size * p.life;
					ctx.beginPath();
					ctx.moveTo(p.x, p.y - s);
					ctx.lineTo(p.x + s * 0.35, p.y - s * 0.35);
					ctx.lineTo(p.x + s, p.y);
					ctx.lineTo(p.x + s * 0.35, p.y + s * 0.35);
					ctx.lineTo(p.x, p.y + s);
					ctx.lineTo(p.x - s * 0.35, p.y + s * 0.35);
					ctx.lineTo(p.x - s, p.y);
					ctx.lineTo(p.x - s * 0.35, p.y - s * 0.35);
					ctx.closePath();
					ctx.fill();
				} else if (id === 'trail_comet') {
					const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.2);
					g.addColorStop(0, 'rgba(225,238,255,1)');
					g.addColorStop(0.4, 'rgba(120,165,255,0.6)');
					g.addColorStop(1, 'rgba(80,120,255,0)');
					ctx.fillStyle = g;
					ctx.beginPath();
					ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
					ctx.fill();
				} else if (id === 'trail_static') {
					ctx.fillStyle = p.bright ? '#ccc' : '#444';
					ctx.fillRect(p.x, p.y, p.size, p.size);
				}
			}
			ctx.globalAlpha = 1;
		}
		tick();

		trailCleanup = () => {
			cancelAnimationFrame(rafId);
			window.removeEventListener('mousemove', onMouse);
			window.removeEventListener('touchmove', onTouch);
			window.removeEventListener('resize', onResize);
			canvas.remove();
		};
	}

	let activeClick = null;

	function spawnClickEffect(x, y) {
		if (!activeClick) return;
		if (activeClick === 'click_ripple') {
			const el = document.createElement('div');
			el.className = 'trust-ripple';
			el.style.cssText = `left:${x}px;top:${y}px;`;
			document.body.appendChild(el);
			setTimeout(() => el.remove(), 750);
		} else if (activeClick === 'click_burst') {
			const wrap = document.createElement('div');
			wrap.style.cssText = `position:fixed;left:${x}px;top:${y}px;pointer-events:none;z-index:9988;`;
			for (let i = 0; i < 8; i++) {
				const angle = (i / 8) * Math.PI * 2;
				const dist = 28 + Math.random() * 20;
				const p = document.createElement('div');
				p.className = 'trust-burst-p';
				p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
				p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
				p.style.setProperty('--hue', `${Math.round(Math.random() * 60 + 190)}`);
				wrap.appendChild(p);
			}
			document.body.appendChild(wrap);
			setTimeout(() => wrap.remove(), 650);
		} else if (activeClick === 'click_shatter') {
			const wrap = document.createElement('div');
			wrap.style.cssText = `position:fixed;left:${x}px;top:${y}px;pointer-events:none;z-index:9988;`;
			for (let i = 0; i < 7; i++) {
				const angle = (i / 7) * Math.PI * 2 + Math.random() * 0.8;
				const dist = 36 + Math.random() * 26;
				const size = 5 + Math.random() * 7;
				const s = document.createElement('div');
				s.className = 'trust-shard';
				s.style.cssText = `width:${size}px;height:${size}px;`;
				s.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
				s.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
				s.style.setProperty('--rot', `${Math.round(Math.random() * 360)}deg`);
				wrap.appendChild(s);
			}
			document.body.appendChild(wrap);
			setTimeout(() => wrap.remove(), 850);
		}
	}

	window.addEventListener('mousedown', (e) => spawnClickEffect(e.clientX, e.clientY));
	window.addEventListener(
		'touchstart',
		(e) => {
			spawnClickEffect(e.touches[0].clientX, e.touches[0].clientY);
		},
		{ passive: true }
	);

	function renderShop(container) {
		const fresh = container.cloneNode(false);
		container.parentNode.replaceChild(fresh, container);
		container = fresh;
		const owned = getOwned();
		const active = getActive();
		const trust = getTrust();

		let html = `
    <div class="trust-shop">
      <div class="trust-shop-title">trust shop</div>
      <div class="trust-shop-balance">trust balance: <strong id="trustShopBal">${trust}</strong></div>
      <div class="trust-shop-cat">⚙ upgrades</div>
      <div class="trust-shop-grid">`;

		for (const upg of UPGRADES) {
			const isOwned = owned.includes(upg.id);
			const canAfford = trust >= upg.cost;
			html += `
      <div class="trust-shop-item${isOwned ? ' trust-item-active' : ''}">
        <div class="trust-item-name">${upg.name}</div>
        <div class="trust-item-desc">${upg.desc}</div>
        <div class="trust-item-cost">${isOwned ? 'owned' : upg.cost + ' trust'}</div>
        ${
					isOwned
						? '<div class="trust-item-btn" style="font-size:.75em;opacity:.4;margin-top:6px;">running</div>'
						: `<button class="small trust-item-btn" data-action="buyupgrade" data-id="${upg.id}"${canAfford ? '' : ' disabled'}>buy</button>`
				}
      </div>`;
		}

		html += `</div>`;

		for (const cat of ['frame', 'trail', 'click']) {
			const items = COSMETICS.filter((c) => c.cat === cat);
			html += `<div class="trust-shop-cat">${CAT_LABELS[cat]}</div><div class="trust-shop-grid">`;
			for (const item of items) {
				const isOwned = owned.includes(item.id);
				const isActive = active[cat] === item.id;
				const canAfford = trust >= item.cost;
				html += `
        <div class="trust-shop-item${isActive ? ' trust-item-active' : ''}">
          <div class="trust-item-name">${item.name}</div>
          <div class="trust-item-desc">${item.desc}</div>
          <div class="trust-item-cost">${isOwned ? 'owned' : item.cost + ' trust'}</div>
          ${
						isOwned
							? isActive
								? `<button class="small trust-item-btn" data-action="unequip" data-cat="${cat}">unequip</button>`
								: `<button class="small trust-item-btn" data-action="equip" data-id="${item.id}">equip</button>`
							: `<button class="small trust-item-btn" data-action="buy" data-id="${item.id}"${canAfford ? '' : ' disabled'}>buy</button>`
					}
        </div>`;
			}
			html += `</div>`;
		}

		html += `</div>`;
		container.innerHTML = html;

		container.addEventListener('click', (e) => {
			const btn = e.target.closest('[data-action]');
			if (!btn) return;
			const action = btn.dataset.action;
			if (action === 'buy') {
				if (!buy(btn.dataset.id)) return;
				const balEl = document.getElementById('mutationTrustAmt');
				if (balEl) balEl.textContent = getTrust();
				renderShop(container);
			} else if (action === 'buyupgrade') {
				const upg = UPGRADES.find((u) => u.id === btn.dataset.id);
				if (!upg) return;
				const o = getOwned();
				if (o.includes(upg.id) || getTrust() < upg.cost) return;
				setTrust(getTrust() - upg.cost);
				o.push(upg.id);
				saveOwned(o);
				startAutoMutate();
				const balEl = document.getElementById('mutationTrustAmt');
				if (balEl) balEl.textContent = getTrust();
				renderShop(container);
			} else if (action === 'equip') {
				equip(btn.dataset.id);
				renderShop(container);
			} else if (action === 'unequip') {
				unequip(btn.dataset.cat);
				renderShop(container);
			}
		});
	}

	function injectStyles() {
		if (document.getElementById('trust-cosmetics-style')) return;
		const s = document.createElement('style');
		s.id = 'trust-cosmetics-style'; // fuckin css
		s.textContent = `
      #trust-frame{position:fixed;inset:0;pointer-events:none;z-index:9990;}
      #trust-frame.frame_signal{
        background:
          linear-gradient(rgba(140,190,255,.55),rgba(140,190,255,.55)) top 8px left 8px/2px 20px no-repeat,
          linear-gradient(rgba(140,190,255,.55),rgba(140,190,255,.55)) top 8px left 8px/20px 2px no-repeat,
          linear-gradient(rgba(140,190,255,.55),rgba(140,190,255,.55)) top 8px right 8px/2px 20px no-repeat,
          linear-gradient(rgba(140,190,255,.55),rgba(140,190,255,.55)) top 8px right 8px/20px 2px no-repeat,
          linear-gradient(rgba(140,190,255,.55),rgba(140,190,255,.55)) bottom 8px left 8px/2px 20px no-repeat,
          linear-gradient(rgba(140,190,255,.55),rgba(140,190,255,.55)) bottom 8px left 8px/20px 2px no-repeat,
          linear-gradient(rgba(140,190,255,.55),rgba(140,190,255,.55)) bottom 8px right 8px/2px 20px no-repeat,
          linear-gradient(rgba(140,190,255,.55),rgba(140,190,255,.55)) bottom 8px right 8px/20px 2px no-repeat;
      }
      #trust-frame.frame_neon{animation:trustNeonPulse 2.5s ease-in-out infinite;}
      #trust-frame.frame_aurora{animation:trustAurora 5s linear infinite;}
      #trust-frame.frame_void{
        background:radial-gradient(ellipse at center,transparent 52%,rgba(0,0,0,.78) 100%);
        animation:trustVoidPulse 4s ease-in-out infinite;
      }
      @keyframes trustNeonPulse{
        0%,100%{box-shadow:inset 0 0 0 1px rgba(100,170,255,.18),inset 0 0 20px rgba(100,170,255,.03);}
        50%{box-shadow:inset 0 0 0 1px rgba(100,170,255,.88),inset 0 0 40px rgba(100,170,255,.13);}
      }
      @keyframes trustAurora{
        0%  {box-shadow:inset 0 0 0 1px hsla(200,80%,65%,.5),inset 0 0 30px hsla(200,80%,65%,.06);}
        25% {box-shadow:inset 0 0 0 1px hsla(280,80%,65%,.5),inset 0 0 30px hsla(280,80%,65%,.06);}
        50% {box-shadow:inset 0 0 0 1px hsla(155,80%,60%,.5),inset 0 0 30px hsla(155,80%,60%,.06);}
        75% {box-shadow:inset 0 0 0 1px hsla(320,80%,65%,.5),inset 0 0 30px hsla(320,80%,65%,.06);}
        100%{box-shadow:inset 0 0 0 1px hsla(200,80%,65%,.5),inset 0 0 30px hsla(200,80%,65%,.06);}
      }
      @keyframes trustVoidPulse{0%,100%{opacity:.55;}50%{opacity:1;}}
      .trust-ripple{
        position:fixed;width:0;height:0;pointer-events:none;z-index:9988;
        transform:translate(-50%,-50%);
      }
      .trust-ripple::after{
        content:'';position:absolute;
        width:38px;height:38px;border-radius:50%;
        border:1.5px solid rgba(160,210,255,.85);
        transform:translate(-50%,-50%) scale(0);
        animation:trustRippleAnim .65s ease-out forwards;
        left:0;top:0;
      }
      @keyframes trustRippleAnim{to{transform:translate(-50%,-50%) scale(3.8);opacity:0;}}
      .trust-burst-p{
        position:absolute;width:5px;height:5px;border-radius:50%;
        background:hsl(var(--hue),100%,72%);
        transform:translate(-50%,-50%);
        animation:trustBurstAnim .55s ease-out forwards;
      }
      @keyframes trustBurstAnim{
        0%{transform:translate(-50%,-50%) translate(0,0);opacity:1;}
        100%{transform:translate(-50%,-50%) translate(var(--dx),var(--dy));opacity:0;}
      }
      .trust-shard{
        position:absolute;
        background:rgba(180,210,255,.7);
        clip-path:polygon(50% 0%,100% 100%,0% 100%);
        transform:translate(-50%,-50%);
        animation:trustShardAnim .78s ease-out forwards;
      }
      @keyframes trustShardAnim{
        0%{transform:translate(-50%,-50%) translate(0,0) rotate(0deg);opacity:.8;}
        100%{transform:translate(-50%,-50%) translate(var(--dx),var(--dy)) rotate(var(--rot));opacity:0;}
      }
      .mutation-trust-header{
        display:flex;justify-content:space-between;align-items:center;
        padding:8px 12px;margin-bottom:14px;
        background:var(--overlay-bg,#0a0a0a);
        border:1px solid var(--border-color,#2a2a2a);border-radius:3px;
        font-size:.85em;
      }
      .mutation-trust-label{opacity:.45;}
      .mutation-trust-value{font-size:1.05em;}
      .mutation-trust-delta{font-size:.78em;margin-top:4px;letter-spacing:.03em;}
      .trust-gain{color:#88dd88;}
      .trust-loss{color:#dd7070;}
      .trust-shop{margin-top:32px;border-top:1px solid var(--border-color,#2a2a2a);padding-top:20px;}
      .trust-shop-title{font-size:.75em;opacity:.35;letter-spacing:.08em;margin-bottom:6px;}
      .trust-shop-balance{font-size:.84em;opacity:.65;margin-bottom:16px;}
      .trust-shop-cat{font-size:.7em;opacity:.3;letter-spacing:.07em;margin:18px 0 8px;text-transform:uppercase;}
      .trust-shop-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(136px,1fr));gap:8px;}
      .trust-shop-item{
        padding:10px;
        border:1px solid var(--border-color,#2a2a2a);border-radius:3px;
        display:flex;flex-direction:column;gap:3px;
      }
      .trust-item-active{border-color:rgba(140,190,255,.38);background:rgba(140,190,255,.04);}
      .trust-item-name{font-size:.84em;}
      .trust-item-desc{font-size:.71em;opacity:.4;flex:1;margin:2px 0 4px;}
      .trust-item-cost{font-size:.71em;opacity:.45;}
      .trust-item-btn{margin-top:6px;width:100%;}
    `;
		document.head.appendChild(s);
	}

	function init() {
		injectStyles();
		startAutoMutate();
		const active = getActive();
		if (active.frame) applyFrame(active.frame);
		if (active.trail) initTrail(active.trail);
		if (active.click) activeClick = active.click;
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

	window.trustCosmetics = { renderShop, buy, equip, unequip };
})();
