window.addEventListener('DOMContentLoaded', () => {
	const ANIM_KEY = 'startAnimConfig';

	let _bg = '#0e0e0e';
	let _fg = '#dcdcdc';

	try {
		const saved = JSON.parse(localStorage.getItem('themeEditorActive') || 'null');
		if (saved?.editorData?.vars) {
			const v = saved.editorData.vars;
			if (v.bgColor) _bg = v.bgColor;
			if (v.textColor) _fg = v.textColor;
		}
	} catch (_) {}

	let config = {
		enabled: true,
		preset: 'default',
		bgColor: 'theme',
		fgColor: 'theme',
		customBg: '#0e0e0e',
		customFg: '#dcdcdc',
		wakeText: 'click/tap to wake up...',
		speed: 'normal',
		skipOnReturn: false,
	};

	try {
		const stored = JSON.parse(localStorage.getItem(ANIM_KEY) || 'null');
		if (stored) config = { ...config, ...stored };
	} catch (_) {}

	const bg = config.bgColor === 'theme' ? _bg : config.customBg;
	const fg = config.fgColor === 'theme' ? _fg : config.customFg;

	if (!config.enabled) return;
	if (config.skipOnReturn && document.referrer.includes(location.hostname)) return;

	runAnimation(config.preset, bg, fg, config.wakeText, config.speed);

	function speedMs(normal, fast, slow) {
		if (config.speed === 'fast') return fast ?? Math.round(normal * 0.5);
		if (config.speed === 'slow') return slow ?? Math.round(normal * 1.8);
		return normal;
	}

	function buildContainer(bg) {
		const style = document.createElement('style');
		style.id = 'startanim-style';
		style.textContent = `
      .sa-container {
        position: fixed; inset: 0; z-index: 999999;
        background: ${bg};
        display: flex; justify-content: center; align-items: center;
        overflow: hidden; opacity: 1;
        transition: opacity ${speedMs(1200, 600, 2000)}ms ease;
      }
      .sa-tap {
        position: absolute; bottom: 8%;
        color: ${fg}; font-size: 0.9em;
        font-family: monospace; letter-spacing: 0.08em;
        opacity: 0; user-select: none; text-transform: lowercase;
        animation: sa-fadein ${speedMs(1500, 800, 2200)}ms ease forwards ${speedMs(800, 400, 1200)}ms,
                   sa-pulse 2s ease-in-out infinite ${speedMs(2500, 1400, 3500)}ms;
      }
      @keyframes sa-fadein {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 0.6; transform: translateY(0); }
      }
      @keyframes sa-pulse {
        0%, 100% { opacity: 0.6; } 50% { opacity: 0.25; }
      }
    `;
		document.head.appendChild(style);

		const container = document.createElement('div');
		container.className = 'sa-container';
		document.body.appendChild(container);
		return container;
	}

	function dismiss(container) {
		container.style.opacity = '0';
		setTimeout(
			() => {
				container.remove();
				document.getElementById('startanim-style')?.remove();
			},
			speedMs(1200, 600, 2000)
		);
	}

	function runAnimation(preset, bg, fg, wakeText, speed) {
		if (preset === 'none') return;

		const PRESETS = {
			default: animDefault,
			fade: animFade,
			glitch: animGlitch,
			scan: animScan,
			typewriter: animTypewriter,
			curtain: animCurtain,
			pixelate: animPixelate,
			ripple: animRipple,
			custom: animCustom,
		};

		const fn = PRESETS[preset] || animDefault;
		fn(bg, fg, wakeText);
	}

	function animDefault(bg, fg, wakeText) {
		const container = buildContainer(bg);
		const line = document.createElement('div');
		const tap = document.createElement('div');
		tap.className = 'sa-tap';
		tap.textContent = wakeText;

		Object.assign(line.style, {
			position: 'absolute',
			top: '50%',
			left: '50%',
			width: '1px',
			height: '1px',
			background: fg,
			transform: 'translate(-50%, -50%)',
			opacity: '0.8',
			transition: `all ${speedMs(800, 400, 1400)}ms cubic-bezier(0.4, 0, 0.2, 1)`,
		});

		container.append(line, tap);

		function startSequence() {
			tap.style.display = 'none';
			line.style.width = '100%';

			setTimeout(
				() => {
					line.style.height = '100%';
					setTimeout(
						() => {
							line.style.transition = `opacity ${speedMs(600, 300, 1000)}ms ease`;
							line.style.opacity = '0';
							setTimeout(() => dismiss(container), speedMs(600, 300, 1000));
						},
						speedMs(800, 400, 1400)
					);
				},
				speedMs(800, 400, 1400)
			);
		}

		container.addEventListener('click', startSequence, { once: true });
		container.addEventListener('touchstart', startSequence, { once: true, passive: true });
	}

	function animFade(bg, fg, wakeText) {
		const container = buildContainer(bg);
		const tap = document.createElement('div');
		tap.className = 'sa-tap';
		tap.textContent = wakeText;
		container.append(tap);

		function startSequence() {
			dismiss(container);
		}

		container.addEventListener('click', startSequence, { once: true });
		container.addEventListener('touchstart', startSequence, { once: true, passive: true });
	}

	function animGlitch(bg, fg, wakeText) {
		const container = buildContainer(bg);

		const style = document.getElementById('startanim-style');
		style.textContent += `
      @keyframes sa-glitch-h {
        0%, 100% { clip-path: inset(0 0 95% 0); transform: translate(-3px, 0); }
        20%       { clip-path: inset(30% 0 50% 0); transform: translate(3px, 0); }
        40%       { clip-path: inset(60% 0 20% 0); transform: translate(-2px, 0); }
        60%       { clip-path: inset(10% 0 80% 0); transform: translate(2px, 0); }
        80%       { clip-path: inset(80% 0 5% 0);  transform: translate(-1px, 0); }
      }
      .sa-glitch-word {
        font-family: monospace; font-size: 1.4em;
        color: ${fg}; letter-spacing: 0.15em;
        text-transform: lowercase; user-select: none;
        position: relative;
      }
      .sa-glitch-word::before, .sa-glitch-word::after {
        content: attr(data-text); position: absolute;
        inset: 0; color: ${fg};
      }
      .sa-glitch-word::before {
        animation: sa-glitch-h ${speedMs(1800, 900, 2800)}ms steps(1) infinite;
        opacity: 0.7; color: #f0f;
      }
      .sa-glitch-word::after {
        animation: sa-glitch-h ${speedMs(2200, 1100, 3200)}ms steps(1) infinite reverse;
        opacity: 0.5; color: #0ff;
      }
    `;

		const word = document.createElement('div');
		word.className = 'sa-glitch-word';
		word.textContent = "auth's rng";
		word.dataset.text = "auth's rng";

		const tap = document.createElement('div');
		tap.className = 'sa-tap';
		tap.textContent = wakeText;

		container.append(word, tap);

		function startSequence() {
			word.style.transition = `opacity ${speedMs(400, 200, 700)}ms`;
			word.style.opacity = '0';
			tap.style.display = 'none';
			setTimeout(() => dismiss(container), speedMs(400, 200, 700));
		}

		container.addEventListener('click', startSequence, { once: true });
		container.addEventListener('touchstart', startSequence, { once: true, passive: true });
	}

	function animScan(bg, fg, wakeText) {
		const container = buildContainer(bg);

		const style = document.getElementById('startanim-style');
		style.textContent += `
      @keyframes sa-scanline {
        from { top: -4px; }
        to   { top: 100%; }
      }
      .sa-scanline {
        position: absolute; left: 0; width: 100%; height: 4px;
        background: linear-gradient(to bottom, transparent, ${fg}44, transparent);
        animation: sa-scanline ${speedMs(2000, 1000, 3200)}ms linear infinite;
        pointer-events: none;
      }
      .sa-scan-text {
        font-family: monospace; font-size: 1em; color: ${fg};
        letter-spacing: 0.1em; text-transform: lowercase;
        opacity: 0; animation: sa-fadein ${speedMs(1000, 500, 1600)}ms ease forwards ${speedMs(600, 300, 1000)}ms;
        user-select: none;
      }
    `;

		const scanline = document.createElement('div');
		scanline.className = 'sa-scanline';

		const label = document.createElement('div');
		label.className = 'sa-scan-text';
		label.textContent = 'system ready';

		const tap = document.createElement('div');
		tap.className = 'sa-tap';
		tap.textContent = wakeText;

		container.append(scanline, label, tap);

		function startSequence() {
			tap.style.display = 'none';
			label.style.transition = `opacity ${speedMs(300, 150, 500)}ms`;
			label.style.opacity = '0';
			dismiss(container);
		}

		container.addEventListener('click', startSequence, { once: true });
		container.addEventListener('touchstart', startSequence, { once: true, passive: true });
	}

	function animTypewriter(bg, fg, wakeText) {
		const container = buildContainer(bg);

		const style = document.getElementById('startanim-style');
		style.textContent += `
      .sa-tw-line {
        font-family: monospace; font-size: 1em; color: ${fg};
        letter-spacing: 0.08em; white-space: pre;
        overflow: hidden; width: 0;
        border-right: 2px solid ${fg};
        animation: sa-tw-expand ${speedMs(1400, 700, 2200)}ms steps(14) forwards ${speedMs(400, 200, 700)}ms,
                   sa-tw-blink 0.75s step-end infinite ${speedMs(1800, 900, 2900)}ms;
        user-select: none;
      }
      @keyframes sa-tw-expand {
        from { width: 0; }
        to   { width: 14ch; border-right-color: transparent; }
      }
      @keyframes sa-tw-blink {
        0%, 100% { border-right-color: ${fg}; }
        50%      { border-right-color: transparent; }
      }
    `;

		const line = document.createElement('div');
		line.className = 'sa-tw-line';
		line.textContent = "auth's rng v9.4";

		const tap = document.createElement('div');
		tap.className = 'sa-tap';
		tap.textContent = wakeText;

		container.append(line, tap);

		function startSequence() {
			tap.style.display = 'none';
			line.style.transition = `opacity ${speedMs(400, 200, 700)}ms`;
			line.style.opacity = '0';
			setTimeout(() => dismiss(container), speedMs(400, 200, 700));
		}

		container.addEventListener('click', startSequence, { once: true });
		container.addEventListener('touchstart', startSequence, { once: true, passive: true });
	}

	function animCurtain(bg, fg, wakeText) {
		const container = buildContainer(bg);

		const style = document.getElementById('startanim-style');
		style.textContent += `
      .sa-curtain-l, .sa-curtain-r {
        position: absolute; top: 0; width: 50%; height: 100%;
        background: ${fg}11;
        border: 1px solid ${fg}22;
        transition: transform ${speedMs(900, 450, 1500)}ms cubic-bezier(0.4, 0, 0.2, 1);
      }
      .sa-curtain-l { left: 0; transform-origin: left; }
      .sa-curtain-r { right: 0; transform-origin: right; }
      .sa-curtain-open .sa-curtain-l { transform: scaleX(0); }
      .sa-curtain-open .sa-curtain-r { transform: scaleX(0); }
    `;

		const cl = document.createElement('div');
		cl.className = 'sa-curtain-l';
		const cr = document.createElement('div');
		cr.className = 'sa-curtain-r';

		const tap = document.createElement('div');
		tap.className = 'sa-tap';
		tap.textContent = wakeText;

		container.append(cl, cr, tap);

		function startSequence() {
			tap.style.display = 'none';
			container.classList.add('sa-curtain-open');
			setTimeout(() => dismiss(container), speedMs(900, 450, 1500));
		}

		container.addEventListener('click', startSequence, { once: true });
		container.addEventListener('touchstart', startSequence, { once: true, passive: true });
	}

	function animPixelate(bg, fg, wakeText) {
		const container = buildContainer(bg);

		const COLS = 12,
			ROWS = 8;
		const grid = document.createElement('div');
		Object.assign(grid.style, {
			position: 'absolute',
			inset: '0',
			display: 'grid',
			gridTemplateColumns: `repeat(${COLS}, 1fr)`,
			gridTemplateRows: `repeat(${ROWS}, 1fr)`,
			pointerEvents: 'none',
		});

		for (let i = 0; i < COLS * ROWS; i++) {
			const cell = document.createElement('div');
			cell.dataset.idx = i;
			Object.assign(cell.style, {
				background: fg,
				opacity: '0',
				transition: `opacity ${speedMs(300, 150, 500)}ms ease`,
			});
			grid.appendChild(cell);
		}

		const tap = document.createElement('div');
		tap.className = 'sa-tap';
		tap.textContent = wakeText;

		container.append(grid, tap);

		function startSequence() {
			tap.style.display = 'none';
			const cells = Array.from(grid.children);
			const shuffled = cells.sort(() => Math.random() - 0.5);
			const chunk = Math.ceil(shuffled.length / 10);

			shuffled.forEach((cell, i) => {
				setTimeout(
					() => {
						cell.style.opacity = '1';
					},
					Math.floor(i / chunk) * speedMs(60, 30, 100)
				);
			});

			setTimeout(() => dismiss(container), speedMs(800, 400, 1400));
		}

		container.addEventListener('click', startSequence, { once: true });
		container.addEventListener('touchstart', startSequence, { once: true, passive: true });
	}

	function animRipple(bg, fg, wakeText) {
		const container = buildContainer(bg);

		const style = document.getElementById('startanim-style');
		style.textContent += `
      @keyframes sa-ripple-expand {
        0%   { width: 0; height: 0; opacity: 0.8; }
        100% { width: 300vmax; height: 300vmax; opacity: 0; }
      }
      .sa-ripple-ring {
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        border: 1px solid ${fg};
        pointer-events: none;
      }
    `;

		const tap = document.createElement('div');
		tap.className = 'sa-tap';
		tap.textContent = wakeText;
		container.append(tap);

		let fired = false;

		function spawnRipple() {
			const ring = document.createElement('div');
			ring.className = 'sa-ripple-ring';
			Object.assign(ring.style, {
				width: '0',
				height: '0',
				opacity: '0.8',
				animation: `sa-ripple-expand ${speedMs(1000, 500, 1600)}ms ease-out forwards`,
			});
			container.appendChild(ring);
			setTimeout(() => ring.remove(), speedMs(1000, 500, 1600));
		}

		function startSequence() {
			if (fired) return;
			fired = true;
			tap.style.display = 'none';
			spawnRipple();
			setTimeout(() => spawnRipple(), speedMs(150, 75, 250));
			setTimeout(() => spawnRipple(), speedMs(300, 150, 500));
			setTimeout(() => dismiss(container), speedMs(600, 300, 1000));
		}

		container.addEventListener('click', startSequence, { once: true });
		container.addEventListener('touchstart', startSequence, { once: true, passive: true });
	}

	function animCustom(bg, fg, wakeText) {
		if (!config.customCode?.trim()) return;
		const container = buildContainer(bg);
		const tap = document.createElement('div');
		tap.className = 'sa-tap';
		tap.textContent = wakeText;
		container.appendChild(tap);
		try {
			new Function('container', 'bg', 'fg', 'wakeText', 'speedMs', 'dismiss', config.customCode)(
				container,
				bg,
				fg,
				wakeText,
				speedMs,
				() => dismiss(container)
			);
		} catch (e) {
			const err = document.createElement('div');
			Object.assign(err.style, {
				position: 'absolute',
				bottom: '20%',
				left: '50%',
				transform: 'translateX(-50%)',
				color: '#ff6666',
				fontFamily: 'monospace',
				fontSize: '0.8em',
				background: 'rgba(0,0,0,0.85)',
				padding: '8px 12px',
				borderRadius: '3px',
				maxWidth: '80%',
				textAlign: 'center',
				zIndex: '1',
			});
			err.textContent = 'error: ' + e.message;
			container.appendChild(err);
			setTimeout(() => dismiss(container), 3000);
		}
	}

	window._saRunPreview = function (cfg, previewBg, previewFg, onDone) {
		document.querySelector('.sa-container')?.remove();
		document.getElementById('startanim-style')?.remove();
		config.speed = cfg.speed || 'normal';
		config.customCode = cfg.customCode || '';
		const PRESETS = {
			default: animDefault,
			fade: animFade,
			glitch: animGlitch,
			scan: animScan,
			typewriter: animTypewriter,
			curtain: animCurtain,
			pixelate: animPixelate,
			ripple: animRipple,
			custom: animCustom,
		};
		(PRESETS[cfg.preset] || animDefault)(
			previewBg,
			previewFg,
			cfg.wakeText || 'click/tap to wake up...'
		);
		if (onDone) {
			const check = setInterval(() => {
				if (!document.querySelector('.sa-container')) {
					clearInterval(check);
					onDone();
				}
			}, 200);
		}
	};
});
