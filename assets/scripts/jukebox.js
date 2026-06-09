(function () {
	'use strict';
	document.body.insertAdjacentHTML(
		'beforeend',
		`<div id="jukebox">
	    <div id="jb-disc-wrap">
	      <div id="jb-disc"></div>
	      <div id="jb-eq">
	        <div class="jb-bar"></div>
	        <div class="jb-bar"></div>
	        <div class="jb-bar"></div>
	      </div>
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
	const discWrap = document.getElementById('jb-disc-wrap');
	discWrap.style.cssText = 'position:relative;width:38px;height:38px;flex-shrink:0;';
	const disc = document.getElementById('jb-disc');
	const panel = document.getElementById('jb-panel');
	const nameEl = document.getElementById('jb-name');
	const btnPlay = document.getElementById('jb-play');
	const btnPrev = document.getElementById('jb-prev');
	const btnNext = document.getElementById('jb-next');
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
		t = t.replace(/\s*\(custom\)/gi, '').replace(/\s*\(default\)/gi, '');
		const d = t.indexOf(' - ');
		if (d > -1 && t.length > 28) t = t.slice(d + 3);
		return t.trim() || '—';
	}
	function saveSettings() {
		if (window.applySettings && window.getCurrentSettings)
			window.applySettings(window.getCurrentSettings());
	}
	function skip(delta) {
		const sel = document.getElementById('musicSelect');
		if (!sel || !sel.options.length) return;
		sel.selectedIndex = (sel.selectedIndex + delta + sel.options.length) % sel.options.length;
		saveSettings();
	}
	function togglePlay() {
		const m = document.getElementById('muteMusic');
		if (!m) return;
		m.checked = !m.checked;
		saveSettings();
	}
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
	disc.addEventListener('click', () =>
		panel.classList.contains('jb-open') ? closePanel() : openPanel()
	);
	btnPlay.addEventListener('click', (e) => {
		e.stopPropagation();
		togglePlay();
		render();
	});
	btnPrev.addEventListener('click', (e) => {
		e.stopPropagation();
		skip(-1);
		render();
	});
	btnNext.addEventListener('click', (e) => {
		e.stopPropagation();
		skip(1);
		render();
	});
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
	setInterval(render, 700);
	window.addEventListener('load', () => setTimeout(render, 800));
})();
