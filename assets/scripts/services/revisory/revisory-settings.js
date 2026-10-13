'use strict';

(function () {
	const ENABLED_KEY = 'revisoryEnabled';

	function isEnabled() {
		return localStorage.getItem(ENABLED_KEY) === '1';
	}

	function formatBytes(n) {
		if (n === null || n === undefined) return '?';
		if (n >= 1e9) return (n / 1e9).toFixed(2) + ' GB';
		if (n >= 1e6) return (n / 1e6).toFixed(1) + ' MB';
		if (n >= 1e3) return (n / 1e3).toFixed(1) + ' KB';
		return n + ' B';
	}

	function buildBarRow(label, usedBytes, limitBytes) {
		const row = document.createElement('div');
		row.style.cssText = 'margin-bottom:10px;';

		const labelRow = document.createElement('div');
		labelRow.style.cssText =
			'display:flex;justify-content:space-between;font-size:0.75em;opacity:0.55;margin-bottom:4px;';
		const nameSpan = document.createElement('span');
		nameSpan.textContent = label;
		const valSpan = document.createElement('span');
		const pct = limitBytes ? Math.min(100, (usedBytes / limitBytes) * 100) : null;
		valSpan.textContent =
			formatBytes(usedBytes) +
			(limitBytes ? ' / ' + formatBytes(limitBytes) : '') +
			(pct !== null ? ' (' + pct.toFixed(1) + '%)' : '');
		labelRow.appendChild(nameSpan);
		labelRow.appendChild(valSpan);

		const track = document.createElement('div');
		track.style.cssText =
			'height:6px;background:var(--border-color);border-radius:3px;overflow:hidden;';
		const fill = document.createElement('div');
		const fillPct = pct === null ? 0 : pct;
		const color = fillPct > 90 ? '#f66' : fillPct > 70 ? '#fa6' : 'var(--text-color)';
		fill.style.cssText =
			'height:100%;width:' +
			fillPct +
			'%;background:' +
			color +
			';opacity:0.55;transition:width 0.3s;';
		track.appendChild(fill);

		row.appendChild(labelRow);
		row.appendChild(track);
		return row;
	}

	async function renderStorageBar(container) {
		if (!window.Revisory) {
			container.textContent = 'revisory not loaded';
			return;
		}
		let usage;
		try {
			usage = await window.Revisory.estimateStorageUsage();
		} catch (e) {
			container.textContent = 'failed to read storage usage: ' + (e.message || e);
			return;
		}

		container.innerHTML = '';
		container.appendChild(
			buildBarRow('localStorage', usage.localStorageBytes, usage.localStorageLimitEstimate)
		);
		container.appendChild(buildBarRow('indexedDB', usage.indexedDBUsage, usage.indexedDBQuota));

		const meta = document.createElement('div');
		meta.style.cssText = 'font-size:0.7em;opacity:0.4;margin-top:6px;';
		meta.textContent =
			usage.revisionCount + ' revisions stored, ' + usage.quarantineCount + ' pending review';
		container.appendChild(meta);
	}

	function buildSettingsRow() {
		const row = document.createElement('div');
		row.className = 'setting-row';
		row.id = 'revisorySettingRow';
		row.innerHTML = `
			<div class="setting-info">
				<span class="setting-name">revisory save protection (advanced) (beta)</span>
				<span class="setting-desc">version-controlled cloud sync with rollback and corruption detection!</span>
			</div>
			<label class="pill-toggle">
				<input type="checkbox" id="revisoryEnabledToggle" />
				<span class="pill-track"></span>
			</label>
		`;
		return row;
	}

	function buildStoragePanel() {
		const wrap = document.createElement('div');
		wrap.id = 'revisoryStoragePanel';
		wrap.style.cssText = 'padding:12px 14px;';

		const title = document.createElement('div');
		title.style.cssText = 'font-size:0.75em;opacity:0.5;margin-bottom:10px;';
		title.textContent = 'storage usage';
		wrap.appendChild(title);

		const barContainer = document.createElement('div');
		barContainer.id = 'revisoryStorageBars';
		wrap.appendChild(barContainer);

		const refreshBtn = document.createElement('button');
		refreshBtn.className = 'small';
		refreshBtn.textContent = 'refresh';
		refreshBtn.style.marginTop = '8px';
		refreshBtn.addEventListener('click', () => renderStorageBar(barContainer));
		wrap.appendChild(refreshBtn);

		const openDashBtn = document.createElement('button');
		openDashBtn.className = 'small';
		openDashBtn.textContent = 'open revisory dashboard';
		openDashBtn.style.cssText = 'margin-top:8px;margin-left:6px;';
		openDashBtn.addEventListener('click', () => {
			if (window.RevisoryDashboard) window.RevisoryDashboard.open();
		});
		wrap.appendChild(openDashBtn);

		return wrap;
	}

	function mountIntoSettings() {
		const dataGroup = Array.from(document.querySelectorAll('.settings-group')).find((g) => {
			const label = g.querySelector('.settings-group-label');
			return label && label.textContent.trim() === 'data';
		});
		if (!dataGroup) {
			setTimeout(mountIntoSettings, 300);
			return;
		}
		if (document.getElementById('revisorySettingRow')) return;

		const settingsRow = buildSettingsRow();
		dataGroup.appendChild(settingsRow);

		const panelSlot = document.createElement('div');
		panelSlot.id = 'revisoryPanelSlot';
		dataGroup.appendChild(panelSlot);

		const toggle = document.getElementById('revisoryEnabledToggle');
		toggle.checked = isEnabled();
		syncPanelVisibility(panelSlot, toggle.checked);

		toggle.addEventListener('change', () => {
			localStorage.setItem(ENABLED_KEY, toggle.checked ? '1' : '0');
			syncPanelVisibility(panelSlot, toggle.checked);
			if (toggle.checked && window.Revisory) {
				window.Revisory.startAutoSnapshot(120000);
			} else if (window.Revisory) {
				window.Revisory.stopAutoSnapshot();
			}
		});
	}

	function syncPanelVisibility(slot, enabled) {
		slot.innerHTML = '';
		if (!enabled) return;
		const panel = buildStoragePanel();
		slot.appendChild(panel);
		renderStorageBar(document.getElementById('revisoryStorageBars'));
	}

	document.addEventListener('revisorySyncQuarantined', (e) => {
		if (window.showAlert) {
			window.showAlert(
				'a cloud sync was flagged as ' +
					e.detail.classification +
					' and held for review. open the revisory dashboard in settings to resolve it.',
				'sync held for review'
			);
		}
	});

	function init() {
		mountIntoSettings();
		if (isEnabled() && window.Revisory) {
			window.Revisory.startAutoSnapshot(120000);
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

	window.RevisorySettings = { isEnabled, renderStorageBar };
})();
