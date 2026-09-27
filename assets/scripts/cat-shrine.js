(function () {
	'use strict';

	const MAX_CATS = 50;
	const UNLOCK_ROLLS = 500;
	const EQUIP_KEY = 'catShrineEquipped';
	const UNLOCK_KEY = 'catShrineUnlocked';

	function openCatDB() {
		return new Promise((resolve, reject) => {
			const req = indexedDB.open('authsrng_catshrine', 1);
			req.onupgradeneeded = (e) => {
				e.target.result.createObjectStore('cats', { keyPath: 'id', autoIncrement: true });
			};
			req.onsuccess = (e) => resolve(e.target.result);
			req.onerror = (e) => reject(e.target.error);
		});
	}

	async function addCat(url) {
		const db = await openCatDB();
		await new Promise((resolve, reject) => {
			const req = db
				.transaction('cats', 'readwrite')
				.objectStore('cats')
				.add({ url, ts: Date.now() });
			req.onsuccess = resolve;
			req.onerror = () => reject(req.error);
		});
		await trimCats();
	}

	async function trimCats() {
		const db = await openCatDB();
		const all = await new Promise((resolve, reject) => {
			const req = db.transaction('cats', 'readonly').objectStore('cats').getAll();
			req.onsuccess = () => resolve(req.result.sort((a, b) => a.ts - b.ts));
			req.onerror = () => reject(req.error);
		});
		const excess = all.length - MAX_CATS;
		if (excess <= 0) return;
		const tx = db.transaction('cats', 'readwrite');
		const store = tx.objectStore('cats');
		for (let i = 0; i < excess; i++) store.delete(all[i].id);
		await new Promise((resolve) => (tx.oncomplete = resolve));
	}

	async function getAllCats() {
		const db = await openCatDB();
		return new Promise((resolve, reject) => {
			const req = db.transaction('cats', 'readonly').objectStore('cats').getAll();
			req.onsuccess = () => resolve(req.result.sort((a, b) => b.ts - a.ts));
			req.onerror = () => reject(req.error);
		});
	}

	async function deleteCat(id) {
		const db = await openCatDB();
		return new Promise((resolve, reject) => {
			const req = db.transaction('cats', 'readwrite').objectStore('cats').delete(id);
			req.onsuccess = resolve;
			req.onerror = () => reject(req.error);
		});
	}

	async function fetchNewCat() {
		const res = await fetch('https://cataas.com/cat?json=true');
		if (!res.ok) throw new Error('cat fetch failed');
		const data = await res.json();
		if (!data.id) throw new Error('no cat id returned');
		return `https://cataas.com/cat/${data.id}`;
	}

	async function refreshGrid() {
		const cats = await getAllCats();
		renderGrid(cats);
		const countEl = document.getElementById('catShrineCount');
		if (countEl) countEl.textContent = `${cats.length}/${MAX_CATS} cats saved`;
		if (window._currentPage === 9 && window.goToPage) window.goToPage(9);
	}

	function checkUnlock() {
		if (localStorage.getItem(UNLOCK_KEY) === '1') return true;
		if (typeof totalRolls !== 'undefined' && totalRolls >= UNLOCK_ROLLS) {
			localStorage.setItem(UNLOCK_KEY, '1');
			if (window.unlockPageDot) window.unlockPageDot(11);
			syncSettingRow();
			return true;
		}
		return false;
	}

	function syncSettingRow() {
		const toggle = document.getElementById('catShrineEnabled');
		const row = document.getElementById('catShrineSettingRow');
		const desc = document.getElementById('catShrineSettingDesc');
		if (!toggle || !row) return;
		const unlocked = localStorage.getItem(UNLOCK_KEY) === '1';
		toggle.disabled = !unlocked;
		row.style.opacity = unlocked ? '1' : '0.4';
		if (desc)
			desc.textContent = unlocked
				? 'wow! emotional support cats for your gambling time..'
				: `wow! emotional support cats for your gambling time.. (unlock at ${UNLOCK_ROLLS} rolls)`;
	}

	function renderGrid(cats) {
		const grid = document.getElementById('catShrineGrid');
		if (!grid) return;
		grid.innerHTML = '';
		const equipped = localStorage.getItem(EQUIP_KEY);
		cats.forEach((cat) => {
			const cell = document.createElement('div');
			cell.className = 'cat-cell' + (equipped === cat.url ? ' equipped' : '');
			const img = document.createElement('img');
			img.src = cat.url;
			img.loading = 'lazy';
			cell.appendChild(img);
			const actions = document.createElement('div');
			actions.className = 'cat-cell-actions';
			const equipBtn = document.createElement('button');
			equipBtn.className = 'small';
			equipBtn.textContent = equipped === cat.url ? 'unequip' : 'equip';
			equipBtn.onclick = () => toggleEquip(cat.url);
			const delBtn = document.createElement('button');
			delBtn.className = 'small';
			delBtn.textContent = 'delete';
			delBtn.onclick = async () => {
				await deleteCat(cat.id);
				if (localStorage.getItem(EQUIP_KEY) === cat.url) unequipCat();
				refreshGrid();
			};
			actions.appendChild(equipBtn);
			actions.appendChild(delBtn);
			cell.appendChild(actions);
			grid.appendChild(cell);
			img.onerror = () => {
				cell.style.opacity = '0.3';
				img.alt = 'this cat wandered off.. nooo';
			};
		});
	}

	function toggleEquip(url) {
		if (localStorage.getItem(EQUIP_KEY) === url) unequipCat();
		else equipCat(url);
		refreshGrid();
	}

	function equipCat(url) {
		localStorage.setItem(EQUIP_KEY, url);
		let pin = document.getElementById('catShrinePin');
		if (!pin) {
			pin = document.createElement('div');
			pin.id = 'catShrinePin';
			pin.title = 'click to unequip your emotional support cat';
			pin.addEventListener('click', unequipCat);
			document.body.appendChild(pin);
		}
		pin.innerHTML = '';
		const img = document.createElement('img');
		img.src = url;
		pin.appendChild(img);
		pin.style.display = 'block';
	}

	function unequipCat() {
		localStorage.removeItem(EQUIP_KEY);
		const pin = document.getElementById('catShrinePin');
		if (pin) pin.style.display = 'none';
		refreshGrid();
	}

	async function summonCat() {
		const btn = document.getElementById('catShrineSummonBtn');
		if (btn) btn.disabled = true;
		try {
			const url = await fetchNewCat();
			await addCat(url);
			await refreshGrid();
		} catch (e) {
			window.showAlert('the shrine failed to summon a cat.. try again?');
		} finally {
			if (btn) btn.disabled = false;
		}
	}

	function bindShrineToggle() {
		const toggle = document.getElementById('catShrineEnabled');
		if (!toggle) return;
		const on = localStorage.getItem('catShrineToggle') === '1';
		toggle.checked = on;
		document.body.classList.toggle('cat-shrine-off', !on);
		toggle.addEventListener('change', () => {
			localStorage.setItem('catShrineToggle', toggle.checked ? '1' : '0');
			document.body.classList.toggle('cat-shrine-off', !toggle.checked);
			const equipped = localStorage.getItem(EQUIP_KEY);
			if (toggle.checked && equipped) equipCat(equipped);
			if (!toggle.checked) {
				const pin = document.getElementById('catShrinePin');
				if (pin) pin.style.display = 'none';
			}
		});
	}

	function init() {
		checkUnlock();
		syncSettingRow();
		bindShrineToggle();

		const summonBtn = document.getElementById('catShrineSummonBtn');
		if (summonBtn) summonBtn.addEventListener('click', summonCat);

		refreshGrid();

		const equipped = localStorage.getItem(EQUIP_KEY);
		if (equipped && localStorage.getItem('catShrineToggle') === '1') equipCat(equipped);

		setInterval(checkUnlock, 5000);
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
	else init();
})();
