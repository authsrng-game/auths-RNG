(function () {
	'use strict';

	const MAX_DOGS = 50;
	const UNLOCK_ROLLS = 500;
	const PAGE_INDEX = 12;
	const EQUIP_KEY = 'dogShrineEquipped';
	const UNLOCK_KEY = 'dogShrineUnlocked';
	const TOGGLE_KEY = 'dogShrineToggle';

	function openDogDB() {
		return new Promise((resolve, reject) => {
			const req = indexedDB.open('authsrng_dogshrine', 1);
			req.onupgradeneeded = (e) => {
				e.target.result.createObjectStore('dogs', { keyPath: 'id', autoIncrement: true });
			};
			req.onsuccess = (e) => resolve(e.target.result);
			req.onerror = (e) => reject(e.target.error);
		});
	}

	async function addDog(url) {
		const db = await openDogDB();
		await new Promise((resolve, reject) => {
			const req = db
				.transaction('dogs', 'readwrite')
				.objectStore('dogs')
				.add({ url, ts: Date.now() });
			req.onsuccess = resolve;
			req.onerror = () => reject(req.error);
		});
		await trimDogs();
	}

	async function trimDogs() {
		const db = await openDogDB();
		const all = await new Promise((resolve, reject) => {
			const req = db.transaction('dogs', 'readonly').objectStore('dogs').getAll();
			req.onsuccess = () => resolve(req.result.sort((a, b) => a.ts - b.ts));
			req.onerror = () => reject(req.error);
		});
		const excess = all.length - MAX_DOGS;
		if (excess <= 0) return;
		const tx = db.transaction('dogs', 'readwrite');
		const store = tx.objectStore('dogs');
		for (let i = 0; i < excess; i++) store.delete(all[i].id);
		await new Promise((resolve) => (tx.oncomplete = resolve));
	}

	async function getAllDogs() {
		const db = await openDogDB();
		return new Promise((resolve, reject) => {
			const req = db.transaction('dogs', 'readonly').objectStore('dogs').getAll();
			req.onsuccess = () => resolve(req.result.sort((a, b) => b.ts - a.ts));
			req.onerror = () => reject(req.error);
		});
	}

	async function deleteDog(id) {
		const db = await openDogDB();
		return new Promise((resolve, reject) => {
			const req = db.transaction('dogs', 'readwrite').objectStore('dogs').delete(id);
			req.onsuccess = resolve;
			req.onerror = () => reject(req.error);
		});
	}

	async function fetchNewDog() {
		const res = await fetch('https://dog.ceo/api/breeds/image/random');
		if (!res.ok) throw new Error('dog fetch failed');
		const data = await res.json();
		if (data.status !== 'success' || !data.message) throw new Error('no dog url returned');
		return data.message;
	}

	async function refreshGrid() {
		const dogs = await getAllDogs();
		renderGrid(dogs);
		const countEl = document.getElementById('dogShrineCount');
		if (countEl) countEl.textContent = `${dogs.length}/${MAX_DOGS} dogs saved`;
		if (window._currentPage === PAGE_INDEX && window.goToPage) window.goToPage(PAGE_INDEX);
	}

	let unlockInterval = null;

	function checkUnlock() {
		if (localStorage.getItem(UNLOCK_KEY) === '1') {
			if (unlockInterval) {
				clearInterval(unlockInterval);
				unlockInterval = null;
			}
			return true;
		}
		if (typeof totalRolls !== 'undefined' && totalRolls >= UNLOCK_ROLLS) {
			localStorage.setItem(UNLOCK_KEY, '1');
			if (window.unlockPageDot) window.unlockPageDot(PAGE_INDEX);
			syncSettingRow();
			if (unlockInterval) {
				clearInterval(unlockInterval);
				unlockInterval = null;
			}
			return true;
		}
		return false;
	}

	function syncSettingRow() {
		const toggle = document.getElementById('dogShrineEnabled');
		const row = document.getElementById('dogShrineSettingRow');
		const desc = document.getElementById('dogShrineSettingDesc');
		if (!toggle || !row) return;
		const unlocked = localStorage.getItem(UNLOCK_KEY) === '1';
		toggle.disabled = !unlocked;
		row.style.opacity = unlocked ? '1' : '0.4';
		if (desc)
			desc.textContent = unlocked
				? 'good boys for your gambling time.. do NOT take that out of context (turns off the cat shrine)'
				: `good boys for your gambling time.. do NOT take that out of context (unlock at ${UNLOCK_ROLLS} rolls)`;
	}

	function renderGrid(dogs) {
		const grid = document.getElementById('dogShrineGrid');
		if (!grid) return;
		grid.innerHTML = '';
		const equipped = localStorage.getItem(EQUIP_KEY);
		dogs.forEach((dog) => {
			const cell = document.createElement('div');
			cell.className = 'cat-cell' + (equipped === dog.url ? ' equipped' : '');
			const img = document.createElement('img');
			img.src = dog.url;
			img.loading = 'lazy';
			cell.appendChild(img);
			const actions = document.createElement('div');
			actions.className = 'cat-cell-actions';
			const equipBtn = document.createElement('button');
			equipBtn.className = 'small';
			equipBtn.textContent = equipped === dog.url ? 'unequip' : 'equip';
			equipBtn.onclick = () => toggleEquip(dog.url);
			const delBtn = document.createElement('button');
			delBtn.className = 'small';
			delBtn.textContent = 'delete';
			delBtn.onclick = async () => {
				await deleteDog(dog.id);
				if (localStorage.getItem(EQUIP_KEY) === dog.url) unequipDog();
				refreshGrid();
			};
			actions.appendChild(equipBtn);
			actions.appendChild(delBtn);
			cell.appendChild(actions);
			grid.appendChild(cell);
			img.onerror = () => {
				cell.style.opacity = '0.3';
				img.alt = 'this dog ran off.. nooo';
			};
		});
	}

	function toggleEquip(url) {
		if (localStorage.getItem(EQUIP_KEY) === url) unequipDog();
		else equipDog(url);
		refreshGrid();
	}

	function equipDog(url) {
		localStorage.setItem(EQUIP_KEY, url);
		let pin = document.getElementById('dogShrinePin');
		if (!pin) {
			pin = document.createElement('div');
			pin.id = 'dogShrinePin';
			pin.title = 'click to unequip your emotional support dog';
			pin.setAttribute('role', 'button');
			pin.setAttribute('tabindex', '0');
			pin.setAttribute('aria-label', 'Unequip emotional support dog');
			pin.addEventListener('click', unequipDog);
			pin.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					unequipDog();
				}
			});
			document.body.appendChild(pin);
		}
		pin.innerHTML = '';
		const img = document.createElement('img');
		img.src = url;
		img.alt = 'Equipped emotional support dog';
		pin.appendChild(img);
		pin.style.display = 'block';
	}

	function unequipDog() {
		localStorage.removeItem(EQUIP_KEY);
		const pin = document.getElementById('dogShrinePin');
		if (pin) pin.style.display = 'none';
		refreshGrid();
	}

	async function summonDog() {
		const btn = document.getElementById('dogShrineSummonBtn');
		const origText = btn ? btn.textContent : '';
		if (btn) {
			btn.disabled = true;
			btn.textContent = 'summoning…';
		}
		try {
			const url = await fetchNewDog();
			await addDog(url);
			await refreshGrid();
		} catch (e) {
			console.warn('[dog-shrine] failed to summon dog:', e ? e.message || e : 'unknown error');
			window.showAlert('the shrine failed to summon a dog.. try again?');
		} finally {
			if (btn) {
				btn.disabled = false;
				btn.textContent = origText || 'summon a dog';
			}
		}
	}

	function isShrineEnabled() {
		return localStorage.getItem(TOGGLE_KEY) === '1';
	}

	function setShrineEnabled(on) {
		const toggle = document.getElementById('dogShrineEnabled');
		if (toggle) toggle.checked = on;
		localStorage.setItem(TOGGLE_KEY, on ? '1' : '0');
		document.body.classList.toggle('dog-shrine-off', !on);
		if (on) {
			const equipped = localStorage.getItem(EQUIP_KEY);
			if (equipped) equipDog(equipped);
		} else {
			const pin = document.getElementById('dogShrinePin');
			if (pin) pin.style.display = 'none';
		}
	}

	window.dogShrineSetEnabled = setShrineEnabled;

	function bindShrineToggle() {
		const toggle = document.getElementById('dogShrineEnabled');
		if (!toggle) return;
		const on = isShrineEnabled();
		toggle.checked = on;
		document.body.classList.toggle('dog-shrine-off', !on);
		toggle.addEventListener('change', () => {
			setShrineEnabled(toggle.checked);
			if (toggle.checked && window.catShrineSetEnabled) window.catShrineSetEnabled(false);
		});
	}

	function init() {
		const isUnlocked = checkUnlock();
		syncSettingRow();
		bindShrineToggle();

		const summonBtn = document.getElementById('dogShrineSummonBtn');
		if (summonBtn) summonBtn.addEventListener('click', summonDog);

		refreshGrid();

		if (isShrineEnabled()) {
			if (window.catShrineSetEnabled) window.catShrineSetEnabled(false);
			const equipped = localStorage.getItem(EQUIP_KEY);
			if (equipped) equipDog(equipped);
		}

		if (!isUnlocked) {
			unlockInterval = setInterval(checkUnlock, 5000);
		}
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
	else init();
})();
