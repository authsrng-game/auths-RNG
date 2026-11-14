(function () {
	'use strict';

	const WINS_FOR_GUN = 250;
	const KILL_REWARD = 5000;
	const DRIP_REWARD = 120;
	const DRIP_INTERVAL = 2 * 60 * 60 * 1000;

	const GUN_SPOT = String.raw`
 _____________
|___    ______|\_____
    |  |  __/  ___  )
    |  | |    |   |
    |__| |____|___|
`;

	const GUN_HELD = String.raw`
                 _
                | |
                | |
               _| |_
              /_   _\
             |  | |  |
             |  |_|  |
            /'-.___.-'\
           |  _______  |
           | |       | |
          /| |       | |\
         / | |       | | \
        (__|_|_______|_|__)
`;

	const HINTS_EARLY = [
		'his hand drifts toward the edge of the table, then stops.',
		'"you have won so much. do you ever wonder what for?"',
	];
	const HINTS_LATE = [
		'something metallic glints under the table. he sees you notice.',
		'"i would not look at the corner of the table, if i were you."',
	];
	const PLEAD_LINES = [
		// berry depressing!
		'"hey hey hey! put that down.. right now!"',
		'"where the hell did you find that?!"',
		'"you think i am the one doing this to you? i only keep the table. theres more of us!"',
		'"put it down. please. there are things only i remember."',
		'"if i go, the table goes. and whatever is left of us stays here."',
		'"this is the part you cannot take back. you cant go out of this."',
		'he sighs. it looks like hes accepting his fate already.',
		'"i knew your dad clover. he was a good man. well, from the outside it was."',
		'"i didnt know the pain he had put onto you."',
		'"i didnt know you developed severe mental issues from all the shit youve endured."',
		'"well... before. now i do. but i shouldve had taken that into account, and let you be."',
    '"but i still decided to stay here."',
		'"i knew i shouldnt have been blunt with you."',
		'"i knew i shouldnt have taken your stuff."',
		'"but im not the one keeping the stuff.."',
		'"i can fix this. i know hes still out there, walking freely. i can kill him, if youd like...?"',
    '"i could be your very own.. yknow, personal therapist for the rest of your life, i dont need pay!"',
    '"i could do anything youd like, ill cut ties with the organization if i need to!"',
		'"you just need to put the gun down!"',
		'"please...?"',
    'he looks at you with the largest puppy eyes ever, but he soon realizes its not gonna work.',
    '*sigh*',
		'"clover. listen to me."',
		'"if you shoot that gun, very bad irreversible things will happen."',
		'"i know ive taken tons of your stuff, but they made me do it, it wasnt my choice."',
		'"im a horrible human being, but im not a monster."',
		'"clover, you were a good girl."',
	];
	const PUTDOWN_LINES = [
		'"...thank you?"',
		'hes more careful now. you can hear his heart pumping.',
	];
	const AFTER_LINES = [
		'the table is quiet.',
		'the deck is still on it. you do not touch it.',
		'you put the gun back where it was.',
		'you stare at the body emotionlessly.',
		"his last night's dinner leaking out of his ruptured stomach, half digested.",
		'but there is no turning back now.',
		'you pulled the trigger.',
		'yes. you.',
		'do you feel guilty?',
	];
	const DEAD_LINES = [
		'the chair is empty. the table keeps something for you anyway.',
		'nobody sits across from you. something still slides over the felt, what is it?',
    'theres nobody.',
	];

	const FRAMES = [
		{ p: 0, ms: 900 },
		{ p: 0, ms: 140, flash: true },
		{ p: 0.12, ms: 500 },
		{ p: 0.4, ms: 500 },
		{ p: 0.75, ms: 600 },
		{ p: 0.97, ms: 700 },
		{ p: 1, ms: 900 },
	];

	let held = false;
	let overlay = null;
	let fig = null;
	let msg = null;
	let row = null;
	let gun = null;
	let pendingPopup = '';

	const store = () => window.dealerStore;
	const wait = (ms) => new Promise((r) => setTimeout(r, ms));
	const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
	const reduced = () => document.body.classList.contains('reduce-motion');
	const decay = (s, p) =>
		s.replace(/\S/g, (c) => (Math.random() < p ? (Math.random() < 0.5 ? ' ' : '.') : c));
	const fmtTime = (ms) =>
		typeof window.formatWellTime === 'function'
			? window.formatWellTime(ms)
			: Math.ceil(ms / 1000) + 's';

	function hint(wins) {
		if (wins < 150 || wins >= WINS_FOR_GUN) return null;
		if (Math.random() > 0.2) return null;
		return pick(wins < 200 ? HINTS_EARLY : HINTS_LATE);
	}

	function grantAnomalies(n) {
		anomalies = (anomalies || 0) + n;
		if (typeof updateAnomalyUI === 'function') updateAnomalyUI();
		if (typeof saveAllData === 'function') saveAllData();
	}

	function onKey(e) {
		const k = e.key.toLowerCase();
		const nav = ['arrowleft', 'arrowright', 'a', 'd', 'w', ' ', '+'].includes(k);
		const palette = k === 'k' && (e.ctrlKey || e.metaKey);
		if (nav || palette) {
			e.preventDefault();
			e.stopImmediatePropagation();
		}
	}

	function setButtons(list) {
		row.innerHTML = '';
		list.forEach(([label, fn, subtle]) => {
			const b = document.createElement('button');
			b.textContent = label;
			if (subtle) {
				b.className = 'small';
				b.style.opacity = '0.65';
			}
			b.addEventListener('click', fn);
			row.appendChild(b);
		});
	}

	function setGun(raised) {
		gun.style.transform = raised ? 'translateY(0)' : 'translateY(110%)';
	}

	function openOverlay() {
		overlay = document.createElement('div');
		overlay.id = 'dealerGunOverlay';
		overlay.style.cssText =
			'position:fixed;inset:0;z-index:100002;background:#000;color:#dcdcdc;display:flex;flex-direction:column;align-items:center;justify-content:space-between;font-family:monospace;cursor:crosshair;overflow:hidden;padding:2vh 16px 0;';

		const top = document.createElement('div');
		top.style.cssText =
			'flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;';

		fig = document.createElement('pre');
		fig.style.cssText =
			'margin:0;font-size:min(1.45vh,1.6vw);line-height:1.05;user-select:none;text-align:left;';
		fig.textContent = window.dealerFigureText || '';

		msg = document.createElement('div');
		msg.style.cssText =
			'min-height:4.5em;max-width:560px;margin-top:2vh;text-align:center;font-style:italic;font-size:0.95em;line-height:1.5;display:flex;align-items:center;justify-content:center;';

		row = document.createElement('div');
		row.style.cssText = 'display:flex;gap:10px;margin-top:1vh;min-height:40px;';

		top.append(fig, msg, row);

		const hands = document.createElement('div');
		hands.style.cssText =
			'height:24vh;width:100%;display:flex;justify-content:center;align-items:flex-end;overflow:hidden;flex-shrink:0;';

		gun = document.createElement('pre');
		gun.textContent = GUN_HELD;
		gun.style.cssText =
			'margin:0;font-size:min(1.5vh,2vw);line-height:1.1;pointer-events:none;user-select:none;transform:translateY(110%);' +
			(reduced() ? '' : 'transition:transform 0.5s ease-out;');
		hands.appendChild(gun);

		overlay.append(top, hands);
		document.body.appendChild(overlay);
		requestAnimationFrame(() => requestAnimationFrame(() => setGun(true)));
	}

	function release() {
		document.removeEventListener('keydown', onKey, true);
		overlay?.remove();
		overlay = null;
		held = false;
		window.__dealerGunHeld = false;
		if (pendingPopup && typeof showAnomalyPopup === 'function') showAnomalyPopup(pendingPopup);
		pendingPopup = '';
		window.renderDealer?.();
	}

	function phaseAim() {
		msg.textContent = 'the gun is heavy. aim at him.';
		fig.onclick = () => phasePlead(0);
		setButtons([['put it down', phasePutDown, true]]);
	}

	function phasePlead(i) {
		fig.onclick = null;
		msg.textContent = PLEAD_LINES[i];
		const last = i >= PLEAD_LINES.length - 1;
		setButtons([
			last ? ['pull the trigger', shoot] : ['...', () => phasePlead(i + 1)],
			['put it down', phasePutDown, true],
		]);
	}

	function phasePutDown() {
		fig.onclick = null;
		setGun(false);
		msg.textContent = pick(PUTDOWN_LINES);
		setButtons([['no', release]]);
	}

	function commitKill() {
		const d = store().load();
		if (d.dead) return false;
		d.dead = true;
		d.session = null;
		d.cooldownUntil = 0;
		d.killedAt = Date.now();
		d.nextDripAt = Date.now() + DRIP_INTERVAL;
		store().save(d);
		grantAnomalies(KILL_REWARD);
		pendingPopup = `+${KILL_REWARD} anomalies`;
		return true;
	}

	async function shoot() {
		fig.onclick = null;
		setButtons([]);
		msg.textContent = '';
		if (!commitKill()) return release();

		const base = window.dealerFigureText || '';
		const fast = reduced();
		for (const f of FRAMES) {
			fig.textContent = decay(base, f.p);
			const flash = f.flash && !fast;
			overlay.style.background = flash ? '#fff' : '#000';
			fig.style.color = flash ? '#000' : '';
			await wait(fast ? Math.min(f.ms, 350) : f.ms);
		}
		overlay.style.background = '#000';
		fig.style.color = '';
		setGun(false);
		phaseAfter(0);
	}

	function phaseAfter(i) {
		msg.textContent = AFTER_LINES[i];
		const last = i >= AFTER_LINES.length - 1;
		setButtons([[last ? 'ok' : 'continue', last ? release : () => phaseAfter(i + 1)]]);
	}

	function pickUp() {
		if (held || store().load().dead) return;
		held = true;
		window.__dealerGunHeld = true;
		document.addEventListener('keydown', onKey, true);
		openOverlay();
		phaseAim();
	}

	function decorate() {
		if (!store()) return;
		const container = document.getElementById('dealerContainer');
		const d = store().load();
		const away = !d.session && Date.now() < (d.cooldownUntil || 0);
		const visible = !!container && container.offsetParent !== null;
		const show = visible && !d.dead && (d.wins || 0) >= WINS_FOR_GUN && !away;
		let spot = document.getElementById('dealerGunSpot');
		if (!show) {
			if (spot) spot.style.display = 'none';
			return;
		}
		if (!spot) {
			spot = document.createElement('pre');
			spot.id = 'dealerGunSpot';
			spot.style.cssText =
				'position:fixed;bottom:18px;right:18px;margin:0;padding:6px;font-size:10px;line-height:1.1;opacity:0.4;cursor:pointer;z-index:1000;transition:opacity 0.2s;';
			spot.textContent = GUN_SPOT;
			spot.addEventListener('mouseenter', () => (spot.style.opacity = '0.9'));
			spot.addEventListener('mouseleave', () => (spot.style.opacity = '0.4'));
			spot.addEventListener('click', pickUp);
			document.body.appendChild(spot);
		}
		spot.style.display = '';
	}

	setInterval(decorate, 500);

	function dripLeft(d) {
		return Math.max(0, (d.nextDripAt || 0) - Date.now());
	}

	function claim() {
		const d = store().load();
		if (!d.dead || dripLeft(d) > 0) return;
		d.nextDripAt = Date.now() + DRIP_INTERVAL;
		store().save(d);
		grantAnomalies(DRIP_REWARD);
		if (typeof showAnomalyPopup === 'function') showAnomalyPopup(`+${DRIP_REWARD} anomalies`);
		refreshDrip();
	}

	function refreshDrip() {
		const status = document.getElementById('dealerDripText');
		const btn = document.getElementById('dealerDripBtn');
		if (!status || !btn || !store()) return;
		const left = dripLeft(store().load());
		status.textContent = left
			? `something will be left for you in ${fmtTime(left)}.`
			: `${DRIP_REWARD} anomalies are waiting.`;
		btn.disabled = left > 0;
	}

	function renderDead(container) {
		container.innerHTML = '';
		const box = document.createElement('div');
		box.className = 'dealer-cooldown-box';
		const line = document.createElement('p');
		line.style.cssText = 'font-style:italic;opacity:0.7;';
		line.textContent = pick(DEAD_LINES);
		const status = document.createElement('div');
		status.id = 'dealerDripText';
		status.style.cssText = 'font-size:0.8em;opacity:0.6;margin-bottom:10px;';
		const btn = document.createElement('button');
		btn.id = 'dealerDripBtn';
		btn.textContent = 'collect';
		btn.addEventListener('click', claim);
		box.append(line, status, btn);
		container.appendChild(box);
		refreshDrip();
	}

	setInterval(refreshDrip, 1000);

	window.DealerGun = { hint, decorate, renderDead };
	window.renderDealer?.();
})();
