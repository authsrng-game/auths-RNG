(function () {
	'use strict';

	const READ_KEY = 'infoTipsRead';

	let readIds = new Set();
	try {
		readIds = new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'));
	} catch (_) {}

	function markRead(id) {
		if (readIds.has(id)) return;
		readIds.add(id);
		try {
			localStorage.setItem(READ_KEY, JSON.stringify([...readIds]));
		} catch (_) {}
		document.querySelectorAll(`.info-tip[data-tip-id="${id}"]`).forEach((el) => {
			el.classList.remove('unread');
		});
	}

	const TOOLTIPS = [
		{
			id: 'anomalies',
			container: () => document.getElementById('anomalyCount'),
			pos: 'inline',
			text: 'drop from rolls rarer than 1/10,000. consume for a permanent luck boost, stacks forever.',
		},
		{
			id: 'sell-rarity',
			container: () => document.querySelector('#inventoryContainer #collectedCounter'),
			pos: 'inline',
			text: 'double click or double tap a rarity to sell extras. you keep one copy always!',
		},
		{
			id: 'wishing-well',
			container: () => document.querySelector('.well-header'),
			pos: 'top-right',
			text: 'throw points in for a chance to double them. has a cooldown between throws.',
		},
		{
			id: 'mutations',
			container: () => document.querySelector('.mutation-panel'),
			pos: 'top-right',
			text: 'combine two owned rarities into a new one. rarer inputs improve the odds of a better result.',
		},
		{
			id: 'luck-multiplier',
			container: () => document.getElementById('luckDisplay'),
			pos: 'top-right',
			text: 'multiplies your odds on every roll. breakdown below shows what is contributing. above is the rolls-since-last-rare, which is rolls since your last hit at or above the rare threshold set in settings.',
		},
		{
			id: 'gauntlets',
			container: () => document.getElementById('gauntletRollDisplay'),
			pos: 'right',
			text: 'collect every rarity in a tier to claim its reward, one time only.',
		},
	];

	function isVisible(el) {
		return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
	}

	function createIcon(tip) {
		const wrap = document.createElement('span');
		wrap.className = `info-tip info-tip-pos-${tip.pos}${readIds.has(tip.id) ? '' : ' unread'}`;
		wrap.dataset.tipId = tip.id;
		wrap.setAttribute('role', 'button');
		wrap.setAttribute('tabindex', '0');
		wrap.setAttribute('aria-label', 'more info');

		const orbit = document.createElement('span');
		orbit.className = 'info-tip-orbit';
		orbit.setAttribute('aria-hidden', 'true');
		orbit.innerHTML = '<span></span><span></span><span></span>';
		wrap.appendChild(orbit);

		wrap.addEventListener('click', (e) => {
			e.stopPropagation();
			openPopover(tip, wrap);
		});
		wrap.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				openPopover(tip, wrap);
			}
		});

		return wrap;
	}

	function tryPlace(tip) {
		const container = tip.container();
		if (!container) return;

		if (tip.pos !== 'inline' && getComputedStyle(container).position === 'static') {
			container.style.position = 'relative';
		}

		let icon = container.querySelector(`:scope > .info-tip[data-tip-id="${tip.id}"]`);
		if (!icon) {
			icon = createIcon(tip);
			container.appendChild(icon);
		}
		icon.style.display = isVisible(container) ? '' : 'none';
	}

	function scanAll() {
		TOOLTIPS.forEach(tryPlace);
	}

	let popoverEl = null;

	function ensurePopover() {
		if (popoverEl) return popoverEl;
		popoverEl = document.createElement('div');
		popoverEl.id = 'infoTipPopover';
		popoverEl.className = 'info-tip-popover';
		popoverEl.setAttribute('role', 'tooltip');
		popoverEl.innerHTML = `
			<div class="info-tip-popover-arrow"></div>
			<div class="info-tip-popover-text"></div>
			<button type="button" class="info-tip-popover-close" aria-label="close">×</button>
		`;
		document.body.appendChild(popoverEl);
		popoverEl.querySelector('.info-tip-popover-close').addEventListener('click', closePopover);
		return popoverEl;
	}

	function closePopover() {
		if (popoverEl) popoverEl.classList.remove('show');
	}

	function openPopover(tip, anchorIcon) {
		const pop = ensurePopover();
		pop.querySelector('.info-tip-popover-text').textContent = tip.text;
		pop.classList.remove('show', 'place-above');
		pop.style.left = '-9999px';
		pop.style.top = '-9999px';

		const iconRect = anchorIcon.getBoundingClientRect();
		const popRect = pop.getBoundingClientRect();

		let placeAbove = false;
		let top = iconRect.bottom + 10;
		if (top + popRect.height > window.innerHeight - 10) {
			placeAbove = true;
			top = iconRect.top - popRect.height - 10;
		}

		let left = iconRect.left + iconRect.width / 2 - popRect.width / 2;
		left = Math.max(10, Math.min(left, window.innerWidth - popRect.width - 10));

		pop.style.top = Math.max(10, top) + 'px';
		pop.style.left = left + 'px';
		pop.classList.toggle('place-above', placeAbove);

		const arrow = pop.querySelector('.info-tip-popover-arrow');
		const arrowLeft = iconRect.left + iconRect.width / 2 - left;
		arrow.style.left = Math.max(14, Math.min(arrowLeft, popRect.width - 14)) + 'px';

		requestAnimationFrame(() => pop.classList.add('show'));
		markRead(tip.id);
	}

	document.addEventListener('click', (e) => {
		if (!popoverEl || !popoverEl.classList.contains('show')) return;
		if (popoverEl.contains(e.target) || e.target.closest('.info-tip')) return;
		closePopover();
	});
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') closePopover();
	});
	window.addEventListener('scroll', closePopover, true);
	window.addEventListener('resize', closePopover);

	function init() {
		scanAll();
		setInterval(scanAll, 1000);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

	document.addEventListener('click', (e) => {
		if (e.target.closest('.page-dot, #nextPage, #prevPage')) {
			setTimeout(scanAll, 120);
		}
	});
})();
