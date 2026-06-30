(function () {
	'use strict';

	console.log(performance.now());

	// ── Inject styles >:DDDDDDDDDDDDDD ──────────────────────────────────────────────────────
	const style = document.createElement('style');
	style.textContent = `
	  #jukebox {
	    position: fixed;
	    top: 14px;
	    left: 14px;
	    z-index: 10001;
	    display: flex;
	    align-items: center;
	    pointer-events: none;
	  }
	
	  #jb-disc {
	    width: 38px;
	    height: 38px;
	    border-radius: 50%;
	    background: conic-gradient(
	      #1c1c1c 0deg, #2e2e2e 45deg, #0f0f0f 100deg,
	      #252525 160deg, #0a0a0a 210deg, #2a2a2a 270deg,
	      #141414 320deg, #1c1c1c 360deg
	    );
	    border: 1.5px solid var(--border-color, #3a3a3a);
	    position: relative;
	    cursor: pointer;
	    pointer-events: auto;
	    flex-shrink: 0;
	    box-shadow: 0 2px 8px rgba(0,0,0,0.5);
	    opacity: 0.22;
	    transition: opacity 0.4s ease, box-shadow 0.2s;
	  }
	
	  #jb-disc::before {
	    content: '';
	    position: absolute;
	    inset: 3px;
	    border-radius: 50%;
	    background: conic-gradient(
	      rgba(255,255,255,0.07) 0deg,
	      rgba(255,255,255,0.01) 90deg,
	      rgba(255,255,255,0.09) 180deg,
	      rgba(255,255,255,0.02) 270deg,
	      rgba(255,255,255,0.07) 360deg
	    );
	    pointer-events: none;
	  }
	
	  #jb-disc::after {
	    content: '';
	    position: absolute;
	    top: 50%; left: 50%;
	    width: 8px; height: 8px;
	    background: var(--bg-color, #0e0e0e);
	    border-radius: 50%;
	    transform: translate(-50%, -50%);
	    border: 1.5px solid var(--border-color, #484848);
	  }
	
	  #jb-disc.jb-active {
	    opacity: 1;
	    box-shadow: 0 2px 14px rgba(0,0,0,0.6);
	  }
	
	  #jb-disc.jb-spinning {
	    animation: jb-spin 2.8s linear infinite;
	  }
	
	  @keyframes jb-spin { to { transform: rotate(360deg); } }
	
	  #jb-disc:hover {
	    box-shadow: 0 2px 18px rgba(220,220,220,0.1);
	  }
	
	  #jb-eq {
	    position: absolute;
	    left: 0; top: 0;
	    width: 38px; height: 38px;
	    border-radius: 50%;
	    display: flex;
	    align-items: flex-end;
	    justify-content: center;
	    gap: 2px;
	    padding-bottom: 7px;
	    pointer-events: none;
	    opacity: 0;
	    transition: opacity 0.3s;
	    z-index: 1;
	  }
	
	  #jb-disc.jb-spinning + #jb-eq {
	    opacity: 0.6;
	  }
	
	  .jb-bar {
	    width: 2px;
	    background: var(--text-color, #dcdcdc);
	    border-radius: 1px;
	  }
	
	  .jb-bar:nth-child(1) { animation: jb-eq1 0.55s ease infinite alternate; }
	  .jb-bar:nth-child(2) { animation: jb-eq1 0.38s ease 0.08s infinite alternate; }
	  .jb-bar:nth-child(3) { animation: jb-eq1 0.65s ease 0.03s infinite alternate; }
	
	  @keyframes jb-eq1 {
	    from { height: 2px; opacity: 0.5; }
	    to   { height: 8px; opacity: 1; }
	  }
	
	  #jb-panel {
	    background: var(--panel-bg, #111);
	    border: 1px solid var(--border-color, #2a2a2a);
	    border-radius: var(--border-radius, 5px);
	    padding: 5px 8px 6px;
	    display: flex;
	    flex-direction: column;
	    gap: 5px;
	    margin-left: 7px;
	    min-width: 190px;
	    opacity: 0;
	    transform: translateX(-6px) scale(0.97);
	    pointer-events: none;
	    transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.4,0,0.2,1);
	    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
	  }
	
	  #jb-panel.jb-open {
	    opacity: 1;
	    transform: translateX(0) scale(1);
	    pointer-events: auto;
	  }
	
	  #jb-row-controls {
	    display: flex;
	    align-items: center;
	    gap: 5px;
	    white-space: nowrap;
	  }
	
	  #jb-name {
	    font-family: monospace;
	    font-size: 0.7em;
	    color: var(--text-color, #dcdcdc);
	    opacity: 0.6;
	    flex: 1;
	    overflow: hidden;
	    text-overflow: ellipsis;
	  }
	
	  #jb-time {
	    font-family: monospace;
	    font-size: 0.6em;
	    color: var(--text-color, #dcdcdc);
	    opacity: 0.3;
	    flex-shrink: 0;
	    white-space: nowrap;
	  }
	
	  #jb-progress-wrap {
	    width: 100%;
	    height: 3px;
	    background: var(--border-color, #333);
	    border-radius: 2px;
	    cursor: pointer;
	    position: relative;
	    transition: height 0.12s;
	    flex-shrink: 0;
	  }
	
	  #jb-progress-wrap:hover {
	    height: 5px;
	  }
	
	  #jb-progress-fill {
	    height: 100%;
	    background: var(--accent-color, #dcdcdc);
	    border-radius: 2px;
	    width: 0%;
	    pointer-events: none;
	  }
	
	  #jb-progress-fill.jb-smooth {
	    transition: width 0.65s linear;
	  }
	
	  #jb-row-vol {
	    display: flex;
	    align-items: center;
	    gap: 6px;
	  }
	
	  #jb-vol-label {
	    font-family: monospace;
	    font-size: 0.6em;
	    color: var(--text-color, #dcdcdc);
	    opacity: 0.3;
	    flex-shrink: 0;
	  }
	
	  #jb-vol {
	    flex: 1;
	    height: 3px;
	    cursor: pointer;
	    accent-color: var(--accent-color, #dcdcdc);
	    -webkit-appearance: none;
	    appearance: none;
	    background: var(--border-color, #333);
	    border-radius: 2px;
	    outline: none;
	    border: none;
	    padding: 0;
	  }
	
	  #jb-vol::-webkit-slider-thumb {
	    -webkit-appearance: none;
	    width: 10px;
	    height: 10px;
	    border-radius: 50%;
	    background: var(--accent-color, #dcdcdc);
	    cursor: pointer;
	  }
	
	  #jb-vol::-moz-range-thumb {
	    width: 10px;
	    height: 10px;
	    border-radius: 50%;
	    background: var(--accent-color, #dcdcdc);
	    cursor: pointer;
	    border: none;
	  }
	
	  .jb-btn {
	    background: none;
	    border: 1px solid var(--border-color, #333);
	    color: var(--text-color, #dcdcdc);
	    width: 22px;
	    height: 22px;
	    padding: 0;
	    border-radius: var(--border-radius, 3px);
	    font-size: 8px;
	    line-height: 1;
	    cursor: pointer !important;
	    opacity: 0.5;
	    transition: opacity 0.12s, background 0.12s;
	    flex-shrink: 0;
	    display: flex;
	    align-items: center;
	    justify-content: center;
	  }
	
	  .jb-btn:hover {
	    opacity: 1 !important;
	    background: var(--button-hover, var(--button-bg, #222));
	  }
	
	  body.legacy-mode #jukebox {
	    top: 52px;
	  }
	`;
	document.head.appendChild(style);

	// ── DOM ────────────────────────────────────────────────────────────────
	// Using a sibling div for eq bars so they don't rotate with the disc
	document.body.insertAdjacentHTML(
		'beforeend',
		`<div id="jukebox">
	    <div id="jb-disc"></div>
	    <div id="jb-eq">
	      <div class="jb-bar"></div>
	      <div class="jb-bar"></div>
	      <div class="jb-bar"></div>
	    </div>
	    <div id="jb-panel">
	      <div id="jb-row-controls">
	        <button class="jb-btn" id="jb-prev" title="previous">&#9664;&#9664;</button>
	        <button class="jb-btn" id="jb-play" title="pause/play">&#9646;&#9646;</button>
	        <button class="jb-btn" id="jb-next" title="next">&#9654;&#9654;</button>
	        <span id="jb-name">—</span>
	        <span id="jb-time"></span>
	      </div>
	      <div id="jb-progress-wrap">
	        <div id="jb-progress-fill"></div>
	      </div>
	      <div id="jb-row-vol">
	        <span id="jb-vol-label">vol</span>
	        <input type="range" id="jb-vol" min="0" max="1" step="0.01" value="0.3">
	      </div>
	    </div>
	  </div>`
	);

	// Re-parent #jb-eq so it's absolutely positioned over the disc
	// (inserted as a sibling of disc inside #jukebox, sits on top via z-index)
	const eq = document.getElementById('jb-eq');
	const jukebox = document.getElementById('jukebox');
	jukebox.style.position = 'fixed'; // already handled by CSS, just ensure
	eq.style.position = 'absolute';
	eq.style.left = '14px';
	eq.style.top = '14px';
	// Actually cleaner to just wrap disc+eq together:
	const discWrap = document.createElement('div');
	discWrap.style.cssText = 'position:relative;width:38px;height:38px;flex-shrink:0;';
	const disc = document.getElementById('jb-disc');
	disc.parentNode.insertBefore(discWrap, disc);
	discWrap.appendChild(disc);
	discWrap.appendChild(eq);
	eq.style.position = 'absolute';
	eq.style.left = '0';
	eq.style.top = '0';
	eq.style.width = '38px';
	eq.style.height = '38px';

	const panel = document.getElementById('jb-panel');
	const nameEl = document.getElementById('jb-name');
	const btnPlay = document.getElementById('jb-play');
	const btnPrev = document.getElementById('jb-prev');
	const btnNext = document.getElementById('jb-next');

	// ── State helpers ──────────────────────────────────────────────────────
	function isPlaying() {
		const a = window.backgroundMusic;
		if (a && !a.paused && a.readyState > 0) return true;
		if (window.customAudioSource) return true;
		return false;
	}

	function isMuted() {
		const n = document.getElementById('muteMusic');
		return n ? n.checked : false;
	}

	function trackName() {
		const sel = document.getElementById('musicSelect');
		if (!sel || sel.selectedIndex < 0) return '—';
		let t = sel.options[sel.selectedIndex].textContent;
		// strip the fucking noise from built-in labels
		t = t.replace(/\s*\(custom\)/gi, '').replace(/\s*\(default\)/gi, '');
		// "Artist - Title" → just Title when long.
		const d = t.indexOf(' - ');
		if (d > -1 && t.length > 28) t = t.slice(d + 3);
		return t.trim() || '—';
	}

	// ── da controls ───────────────────────────────────────────────────────────

	let _skipBusy = false;

	async function skip(delta) {
		if (_skipBusy) return;
		_skipBusy = true;
		const sel = document.getElementById('musicSelect');
		if (!sel || !sel.options.length) {
			_skipBusy = false;
			return;
		}
		sel.selectedIndex = (sel.selectedIndex + delta + sel.options.length) % sel.options.length;
		try {
			await saveSettings();
		} finally {
			_skipBusy = false;
		}
	}
	
	async function saveSettings() {
		if (window.applySettings && window.getCurrentSettings)
			await window.applySettings(window.getCurrentSettings());
	}

	async function togglePlay() {
		const m = document.getElementById('muteMusic');
		if (!m) return;
		// a shrimp could theoretically pilot a fucking mech if given enough funding
		m.checked = !m.checked;
		await saveSettings();
	}
	
	btnPlay.addEventListener('click', async (e) => {
		e.stopPropagation();
		await togglePlay();
		render();
	});
	btnPrev.addEventListener('click', async (e) => {
		e.stopPropagation();
		await skip(-1);
		render();
	});
	btnNext.addEventListener('click', async (e) => {
		e.stopPropagation();
		await skip(1);
		render();
	});

	function formatTime(s) {
		if (!isFinite(s) || s < 0) return '0:00';
		return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
	}

	function getDuration() {
		if (window.customAudioBuffer) return window.customAudioBuffer.duration;
		const a = window.backgroundMusic;
		return a && isFinite(a.duration) && a.duration > 0 ? a.duration : 0;
	}

	function getCurrentTime() {
		if (
			window.customAudioSource &&
			window.audioContext != null &&
			window.customAudioStartTime != null
		) {
			const elapsed =
				window.audioContext.currentTime -
				window.customAudioStartTime +
				(window.customAudioOffset || 0);
			const dur = getDuration();
			return dur ? elapsed % dur : elapsed;
		}
		const a = window.backgroundMusic;
		return a && !a.paused ? a.currentTime : 0;
	}

	function seekTo(ratio) {
		const dur = getDuration();
		if (!dur) return;
		const target = Math.max(0, Math.min(dur, ratio * dur));
		if (window.customAudioSource && window.audioContext && window.customAudioBuffer) {
			try {
				window.customAudioSource.stop();
			} catch (_) {}
			const src = window.audioContext.createBufferSource();
			src.buffer = window.customAudioBuffer;
			src.loop = true;
			src.connect(window.customAudioGain || window.audioContext.destination);
			src.start(0, target);
			window.customAudioSource = src;
			window.customAudioStartTime = window.audioContext.currentTime;
			window.customAudioOffset = target;
			return;
		}
		const a = window.backgroundMusic;
		if (a && isFinite(a.duration)) a.currentTime = target;
	}

	function getVolume() {
		if (window.customAudioGain) return window.customAudioGain.gain.value;
		if (window.backgroundMusic) return window.backgroundMusic.volume;
		return 0.3;
	}

	function setVolume(v) {
		if (window.customAudioGain) window.customAudioGain.gain.value = v;
		if (window.backgroundMusic) window.backgroundMusic.volume = v;
	}

	// ── Render ─────────────────────────────────────────────────────────────
	let seekDragging = false;
	let volUserActive = false;

	function render() {
		const active = !isMuted();
		const playing = isPlaying() && active;

		disc.classList.toggle('jb-active', active);
		disc.classList.toggle('jb-spinning', playing);
		btnPlay.innerHTML = isMuted() ? '&#9654;' : '&#9646;&#9646;';
		btnPlay.title = isMuted() ? 'play' : 'pause';
		nameEl.textContent = trackName();

		const dur = getDuration();
		const cur = getCurrentTime();
		const fill = document.getElementById('jb-progress-fill');
		const timeEl = document.getElementById('jb-time');
		const volEl = document.getElementById('jb-vol');

		if (fill && !seekDragging) {
			fill.classList.add('jb-smooth');
			fill.style.width = (dur ? (cur / dur) * 100 : 0) + '%';
		}
		if (timeEl) timeEl.textContent = dur ? formatTime(cur) + ' / ' + formatTime(dur) : '';
		if (volEl && !volUserActive) volEl.value = getVolume();
	}

	// ── Panel open / close ─────────────────────────────────────────────────
	let closeTimer;
	const openPanel = () => {
		clearTimeout(closeTimer);
		panel.classList.add('jb-open');
	};
	const closePanel = () => {
		closeTimer = setTimeout(() => panel.classList.remove('jb-open'), 900);
	};

	discWrap.addEventListener('mouseenter', openPanel);
	discWrap.addEventListener('mouseleave', closePanel);
	panel.addEventListener('mouseenter', () => clearTimeout(closeTimer));
	panel.addEventListener('mouseleave', closePanel);

	// tap to toggle on touch
	disc.addEventListener('click', () =>
		panel.classList.contains('jb-open') ? closePanel() : openPanel()
	);

	const progressWrap = document.getElementById('jb-progress-wrap');
	const progressFill = document.getElementById('jb-progress-fill');

	if (progressWrap && progressFill) {
		function doSeek(clientX) {
			const rect = progressWrap.getBoundingClientRect();
			const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
			progressFill.classList.remove('jb-smooth');
			progressFill.style.width = ratio * 100 + '%';
			seekTo(ratio);
		}

		progressWrap.addEventListener('mousedown', (e) => {
			e.stopPropagation();
			seekDragging = true;
			doSeek(e.clientX);
		});
		document.addEventListener('mousemove', (e) => {
			if (!seekDragging) return;
			doSeek(e.clientX);
		});
		document.addEventListener('mouseup', () => {
			if (!seekDragging) return;
			seekDragging = false;
			progressFill.classList.add('jb-smooth');
		});

		progressWrap.addEventListener(
			'touchstart',
			(e) => {
				seekDragging = true;
				doSeek(e.touches[0].clientX);
			},
			{ passive: true }
		);
		document.addEventListener(
			'touchmove',
			(e) => {
				if (!seekDragging) return;
				doSeek(e.touches[0].clientX);
			},
			{ passive: true }
		);
		document.addEventListener('touchend', () => {
			seekDragging = false;
			progressFill.classList.add('jb-smooth');
		});
	}

	const volSlider = document.getElementById('jb-vol');
	if (volSlider) {
		volSlider.addEventListener('mousedown', () => {
			volUserActive = true;
		});
		volSlider.addEventListener(
			'touchstart',
			() => {
				volUserActive = true;
			},
			{ passive: true }
		);
		volSlider.addEventListener('input', () => setVolume(parseFloat(volSlider.value)));
		volSlider.addEventListener('mouseup', () =>
			setTimeout(() => {
				volUserActive = false;
			}, 1200)
		);
		volSlider.addEventListener('touchend', () =>
			setTimeout(() => {
				volUserActive = false;
			}, 1200)
		);
	}

	// ── Poll for external state changes ────────────────────────────────────
	// (e.g. user mutes from settings panel, or a track finishes. i mean this is pretty self explainatory)
	setInterval(render, 700);
	window.addEventListener('load', () => setTimeout(render, 800));
})();
