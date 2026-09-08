(function () {
	'use strict';
	// TODO: make it so you shoot the dealer with a pistol
	console.log(performance.now());

	const DEALER_KEY = 'dealerData';
	const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 11=J 12=Q 13=K 14=A
	const RANK_LABEL = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
	const ENCOUNTER_COOLDOWN = 3 * 60 * 60 * 1000;

	const SESSION_DURATION = 5 * 60 * 1000;

	const TIMEOUT_LINES = [
		'"time\'s up." he starts folding into the noise before you can protest. he vanishes in your sight..',
		'he checks a watch that wasn\'t there before. "we\'re done here, buckaroo."',
  '*he dips.*',
	];

	const TELLS_STRONG = ["he doesn't blink.", '"go on. call it."', 'taps the table twice, slow.', 'id win anyway.'];
	const TELLS_WEAK = [
		'his coat shifts. just fabric. probably.',
		'"...your funeral." something almost like nerves... ooh',
		"he's too still. that's new.",
  'hm.',
	];
	const TELLS_NEUTRAL = ['"heh."', 'what's that smell?'];

	const ARRIVAL_LINES = [
		'a shape steadies in the static. "...you again."',
		'you feel eyes before you see him. "sit."',
		"the air gets heavier. he's already dealing.",
		'"lost your friends up there yet?" he nods toward the rolls.',
  'he stares at you coldly.',
  'what are you gonna do, shoot me?',
	];
	const WIN_LINES = [
		'he exhales through his teeth. "...fine."',
		'"keep it. i\'ve got plenty.."',
		'for a second his coat isn\'t a coat. then it is again. "well played."',
  'sigh.',
  'you earned it. now its my time.',
	];
	const LOSE_LINES = [
		"he doesn't gloat. that's worse!",
		'"i did say." he takes it without ceremony.',
		'the deck folds itself back into shape. "again?"',
  'sigh. this is boring, get better',
	];
	const FOLD_LINES = [
		'"smart. boring. smart. i hate you."',
		'he shrugs, already re-dealing.',
		'"you\'ll call eventually. everyone does."',
  'too scared to call? pfft..',
	];
	const TIER_UP_LINES = [
		'"you\'re paying attention. i\'ll pay attention too."',
		'he stops blinking entirely for the rest of the hand.',
		'"no more games between us, then. really play."',
  'you are more better than i thought.',
  '*he thinks... slowly...*'
	];
	const DEPART_LINES = [
		'he folds back into the noise between rolls.',
		'"same time, whenever that is." he\'s already gone...?',
  'goodbye.',
  'he gets up and disappears under a blink...',
	];

	function pick(arr) {
		return arr[
			Math.floor((typeof Plush !== 'undefined' ? Plush.float() : Math.random()) * arr.length)
		];
	}
	function rnd() {
		return typeof Plush !== 'undefined' ? Plush.float() : Math.random();
	}

	function isUnlocked() {
		return localStorage.getItem('dealerUnlocked') === '1';
	}

	function freshSession() {
		return {
			deck: [...RANKS],
			discard: [],
			tier: 0,
			handsPlayed: 0,
			correctReads: 0,
			active: null,
			startedAt: Date.now(),
		};
	}

	function sessionTimeLeft(s) {
		return SESSION_DURATION - (Date.now() - (s.startedAt || Date.now()));
	}

	function loadData() {
		try {
			const d = JSON.parse(localStorage.getItem(DEALER_KEY) || '{}');
			return Object.assign({ cooldownUntil: 0, session: null, metWelcome: false, log: [] }, d);
		} catch {
			return { cooldownUntil: 0, session: null, metWelcome: false, log: [] };
		}
	}
	function saveData(d) {
		localStorage.setItem(DEALER_KEY, JSON.stringify(d));
	}

	function fmtTime(ms) {
		return typeof window.formatWellTime === 'function'
			? window.formatWellTime(ms)
			: Math.ceil(ms / 1000) + 's';
	}

	function drawCards(session, n) {
		if (session.deck.length < n) {
			session.deck = session.deck.concat(session.discard);
			session.discard = [];
		}
		const out = [];
		for (let i = 0; i < n; i++) {
			const idx = Math.floor(rnd() * session.deck.length);
			out.push(session.deck.splice(idx, 1)[0]);
		}
		return out;
	}

	function reliabilityForTier(tier) {
		return [0.8, 0.65, 0.5, 0.35][Math.min(tier, 3)];
	}

	function cardBox(rank, hidden) {
		const label = hidden ? '?' : String(RANK_LABEL[rank] || rank);
		const pad = label.length === 1 ? ' ' + label + ' ' : label;
		return `┌─────┐\n│  ${pad} │\n└─────┘`;
	}

	function startHand(data) {
		const s = data.session;
		const playerHand = drawCards(s, 3);
		const dealerHand = drawCards(s, 3);
		const dealerBest = Math.max(...dealerHand);
		const reliability = reliabilityForTier(s.tier);
		const honest = rnd() < reliability;

		let tellPool;
		if (!honest) tellPool = TELLS_NEUTRAL;
		else tellPool = dealerBest >= 10 ? TELLS_STRONG : TELLS_WEAK;
		const tell = pick(tellPool);

		s.active = {
			playerHand,
			dealerHand,
			dealerBest,
			tell,
			chosenIdx: null,
			stake: 1,
		};
		saveData(data);
		renderDealer();
	}

	function chooseActive(data, idx) {
		data.session.active.chosenIdx = idx;
		saveData(data);
		renderDealer();
	}

	function setStake(data, stake) {
		data.session.active.stake = stake;
		saveData(data);
		renderDealer();
	}

	function resolveHand(data, action) {
		const s = data.session;
		const hand = s.active;
		const playerCard = hand.playerHand[hand.chosenIdx];

		// dealer AI: at higher tiers, sometimes doesn't play his best card
		const deviateChance = [0, 0.15, 0.3, 0.45][Math.min(s.tier, 3)];
		let dealerCard = hand.dealerBest;
		if (rnd() < deviateChance) {
			const sorted = [...hand.dealerHand].sort((a, b) => a - b);
			dealerCard = sorted[Math.floor(rnd() * sorted.length)];
		}

		// return cards to discard
		s.discard.push(...hand.playerHand, ...hand.dealerHand);

		// simple correctness heuristic for tier ramping
		const shouldCall = playerCard >= 9;
		let correct = false;
		let outcome; // 'win' | 'lose' | 'fold'

		if (action === 'fold') {
			outcome = 'fold';
			correct = !shouldCall;
		} else {
			const won = playerCard > dealerCard;
			outcome = won ? 'win' : 'lose';
			correct = shouldCall === won ? shouldCall : correct;
			correct = shouldCall; // called and it matched the "should call" heuristic
		}

		s.handsPlayed++;
		if (correct) s.correctReads++;

		let resultText = '';
		let reward = null;

		if (outcome === 'fold') {
			resultText = pick(FOLD_LINES);
		} else if (outcome === 'win') {
			resultText = pick(WIN_LINES);
			reward = applyWin(hand.stake);
		} else {
			resultText = pick(LOSE_LINES);
			reward = applyLoss(hand.stake);
		}

		// tier ramp check every 3 hands
		let tierChanged = false;
		if (s.handsPlayed % 3 === 0) {
			const acc = s.correctReads / s.handsPlayed;
			if (acc > 0.66 && s.tier < 3) {
				s.tier++;
				tierChanged = true;
			} else if (acc < 0.33 && s.tier > 0) {
				s.tier--;
			}
		}

		s.active = null;
		data.cooldownUntil = 0; // hands don't cooldown, only leaving the table does
		saveData(data);

		showHandResult(outcome, dealerCard, playerCard, resultText, reward, tierChanged);
	}

	function applyWin(stake) {
		const roll = rnd();
		if (roll < 0.08) {
			anomalies = (anomalies || 0) + Math.round(20 * stake);
			updateAnomalyUI?.();
			saveAllData?.();
			return `+${Math.round(20 * stake)} anomalies`;
		}
		const pts = Math.round(2000 * stake);
		points += pts;
		updatePointsDisplay?.();
		updateShopUI?.();
		saveAllData?.();
		return `+${formatNum ? formatNum(pts) : pts} points`;
	}

	function applyLoss(stake) {
		if (anomalies > 0) {
			const lost = Math.min(anomalies, Math.round(5 * stake));
			anomalies -= lost;
			updateAnomalyUI?.();
			saveAllData?.();
			return `-${lost} anomalies`;
		}
		const keys = Object.keys(shopUpgrades || {}).filter((k) => shopUpgrades[k] > 0);
		if (keys.length) {
			const key = keys[Math.floor(rnd() * keys.length)];
			shopUpgrades[key]--;
			updateShopUI?.();
			saveAllData?.();
			return `-1 ${key} upgrade level`;
		}
		return 'nothing left to take';
	}

	function showHandResult(outcome, dealerCard, playerCard, text, reward, tierChanged) {
		const modal = document.createElement('div');
		modal.style.cssText =
			'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;';
		const outcomeLabel =
			outcome === 'win' ? 'you win.' : outcome === 'lose' ? 'you lose.' : 'you folded.';
		modal.innerHTML = `
      <div class="modal-content dealer-modal" style="max-width:340px;">
        <pre class="dealer-ascii-small">${cardBox(playerCard)}   ${cardBox(dealerCard)}</pre>
        <div style="font-size:0.75em;opacity:0.5;margin:-6px 0 10px;">you &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; him</div>
        <h3 style="margin:0 0 6px;">${outcomeLabel}</h3>
        <p style="font-style:italic;opacity:0.75;">${text}</p>
        ${reward ? `<p style="opacity:0.7;">${reward}</p>` : ''}
        ${tierChanged ? `<p style="color:#f88;font-size:0.85em;">${pick(TIER_UP_LINES)}</p>` : ''}
        <button class="small" id="dealerResultClose">continue</button>
      </div>`;
		document.body.appendChild(modal);
		modal.querySelector('#dealerResultClose').addEventListener('click', () => {
			modal.remove();
			renderDealer();
		});
	}

	function leaveTable(data, forced = false) {
		data.session = null;
		data.cooldownUntil = Date.now() + ENCOUNTER_COOLDOWN;
		saveData(data);
		showAnomalyPopup?.(pick(forced ? TIMEOUT_LINES : DEPART_LINES));
		renderDealer();
	}
	window.dealerLeaveTable = leaveTable;

	const DEALER_FIGURE = `
                 .-""""-.
               .'  .--.  '.
              /   /    \\   \\
             ;   |  o o |   ;
             |   |   ^  |   |
             ;   | '-'  |   ;
              \\   \\____/  /
               '.        .'
                 '-.__.-'
                    ||
              .-----||-----.
             /      ||      \\
            /       ||       \\
           /     .--||--.     \\
          ;     /   ||   \\     ;
          |    /  __||__   \\    |
          |   ;  /  ||  \\   ;   |
          |   | /___||___\\  |   |
          ;   |     ||       |   ;
          \\  |    /||\\     |  /
           \\ |   /_||_\\    | /
            \\|      ||      |/
              |      ||      |
              |      ||      |
             /|      ||      |\\
            / |      ||      | \\
           /  |______||______|  \\
          /______________________\\
             /              \\
            /   _        _   \\
           /___/ \\______/ \\___\\
`;

	let _dealerParallaxBound = false;

	function initDealerParallax() {
		if (_dealerParallaxBound) return;
		const scene = document.getElementById('dealerScene');
		const inner = scene?.querySelector('.dealer-scene-inner');
		if (!scene || !inner) return;
		if (!window.matchMedia('(pointer: fine)').matches) return;

		_dealerParallaxBound = true;

		scene.addEventListener('mousemove', (e) => {
			if (document.body.classList.contains('reduce-motion')) return;
			const rect = scene.getBoundingClientRect();
			const x = (e.clientX - rect.left) / rect.width - 0.5;
			const y = (e.clientY - rect.top) / rect.height - 0.5;
			inner.style.transform = `rotateY(${x * 6}deg) rotateX(${y * -4}deg)`;
		});
		scene.addEventListener('mouseleave', () => {
			inner.style.transform = 'rotateY(0deg) rotateX(0deg)';
		});
	}

	function updateDealerScene(tier, present) {
		const scene = document.getElementById('dealerScene');
		const figure = document.getElementById('dealerFigure');
		if (!scene || !figure) return;
		scene.style.display = '';
		figure.textContent = DEALER_FIGURE;
		scene.dataset.tier = present ? String(tier) : 'none';
		scene.classList.toggle('dealer-scene-empty', !present);
	}

	function renderDealer() {
		const container = document.getElementById('dealerContainer');
		if (!container) return;

		if (!isUnlocked()) {
			const scene = document.getElementById('dealerScene');
			if (scene) scene.style.display = 'none';
			container.innerHTML = `
      <div class="starmap-locked">
        <div class="starmap-locked-icon">🎭</div>
        <div class="starmap-locked-text">the table is empty</div>
        <div class="starmap-locked-sub">complete the insane gauntlet to unlock</div>
      </div>`;
			return;
		}

		const data = loadData();
		container.innerHTML = '';

		if (!data.session) {
			if (Date.now() < data.cooldownUntil) {
				updateDealerScene(0, false);
				const cd = document.createElement('div');
				cd.className = 'dealer-cooldown-box';
				cd.innerHTML = `<div>the table is empty. he'll be back in ${fmtTime(data.cooldownUntil - Date.now())}.</div>`;
				container.appendChild(cd);
				return;
			}
			updateDealerScene(0, true);
			const sitBox = document.createElement('div');
			sitBox.className = 'dealer-cooldown-box';
			sitBox.innerHTML = `
      <p style="font-style:italic;opacity:0.7;">${pick(ARRIVAL_LINES)}</p>
      <button class="small" id="dealerSitBtn">sit down</button>
    `;
			container.appendChild(sitBox);
			sitBox.querySelector('#dealerSitBtn').addEventListener('click', () => {
				data.session = freshSession();
				saveData(data);
				renderDealer();
			});
			return;
		}

		const s = data.session;

		if (sessionTimeLeft(s) <= 0) {
			leaveTable(data, true);
			return;
		}

		updateDealerScene(s.tier, true);
		const timerText = `leaves in ${fmtTime(sessionTimeLeft(s))}`;

		if (!s.active) {
			const startBox = document.createElement('div');
			startBox.className = 'dealer-table-box';
			startBox.innerHTML = `
      <div class="dealer-session-stats">hands: ${s.handsPlayed} · read accuracy: ${s.handsPlayed ? Math.round((s.correctReads / s.handsPlayed) * 100) : 0}% · his attention: tier ${s.tier}</div>
      <div class="dealer-session-timer">${timerText}</div>
      <button id="dealerNextHandBtn">deal next hand</button>
      <button class="small" id="dealerLeaveBtn" style="opacity:0.6;">leave the table</button>
    `;
			container.appendChild(startBox);
			startBox.querySelector('#dealerNextHandBtn').addEventListener('click', () => startHand(data));
			startBox.querySelector('#dealerLeaveBtn').addEventListener('click', () => leaveTable(data));
			return;
		}

		const hand = s.active;
		const box = document.createElement('div');
		box.className = 'dealer-table-box';

		const timerEl = document.createElement('div');
		timerEl.className = 'dealer-session-timer';
		timerEl.textContent = timerText;
		box.appendChild(timerEl);

		const cardsRow = document.createElement('div');
		cardsRow.className = 'dealer-hand-row';
		hand.playerHand.forEach((rank, i) => {
			const c = document.createElement('pre');
			c.className = 'dealer-ascii-card' + (hand.chosenIdx === i ? ' dealer-card-chosen' : '');
			c.textContent = cardBox(rank);
			c.addEventListener('click', () => chooseActive(data, i));
			cardsRow.appendChild(c);
		});
		box.appendChild(cardsRow);

		const tellEl = document.createElement('p');
		tellEl.className = 'dealer-tell-text';
		tellEl.textContent = hand.tell;
		box.appendChild(tellEl);

		if (hand.chosenIdx === null) {
			const hint = document.createElement('p');
			hint.style.cssText = 'font-size:0.8em;opacity:0.5;';
			hint.textContent = 'pick your card.';
			box.appendChild(hint);
		} else {
			const stakeRow = document.createElement('div');
			stakeRow.className = 'dealer-stake-row';
			[0.5, 1, 2].forEach((st) => {
				const b = document.createElement('button');
				b.className = 'small' + (hand.stake === st ? ' dealer-stake-active' : '');
				b.textContent = st + 'x stake';
				b.addEventListener('click', () => setStake(data, st));
				stakeRow.appendChild(b);
			});
			box.appendChild(stakeRow);

			const actionRow = document.createElement('div');
			actionRow.className = 'dealer-action-row';
			const callBtn = document.createElement('button');
			callBtn.textContent = 'call';
			callBtn.addEventListener('click', () => resolveHand(data, 'call'));
			const foldBtn = document.createElement('button');
			foldBtn.className = 'small';
			foldBtn.style.opacity = '0.7';
			foldBtn.textContent = 'fold';
			foldBtn.addEventListener('click', () => resolveHand(data, 'fold'));
			actionRow.appendChild(callBtn);
			actionRow.appendChild(foldBtn);
			box.appendChild(actionRow);
		}

		container.appendChild(box);
	}

	window.renderDealer = renderDealer;

	function tryInit(n) {
		if (document.getElementById('dealerContainer')) {
			renderDealer();
			initDealerParallax();
		} else if (n > 0) {
			setTimeout(() => tryInit(n - 1), 200);
		}
	}
	tryInit(25);
	setInterval(() => {
		if (loadData().session) renderDealer();
	}, 1000);
})();
