(function () {
	var DELAY_SECONDS = 3;

	function show() {
		if (document.getElementById('outage-popup-overlay')) return;

		var style = document.createElement('style');
		style.id = 'outage-popup-style';
		style.textContent =
			'#outage-popup-overlay{position:fixed;inset:0;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;z-index:2147483647;padding:16px;box-sizing:border-box}' +
			'#outage-popup{background:var(--panel-bg,#131313);color:var(--text-color,#dcdcdc);border:1px solid var(--border-color,#303030);border-radius:var(--border-radius,2px);max-width:480px;width:100%;padding:20px;box-sizing:border-box;font-family:inherit;animation:scale-up-center .2s ease-out}' +
			'#outage-popup h3{margin:0 0 12px;font-size:1.2em}' +
			'#outage-popup p{margin:0 0 12px;line-height:1.5}' +
			'#outage-popup-ok{display:block;margin:16px auto 0;padding:8px 20px;font-family:inherit;font-size:1em;background:var(--button-bg,#1a1a1a);color:var(--button-text,#dcdcdc);border:1px solid var(--border-color,#303030);border-radius:var(--border-radius,2px);cursor:pointer}' +
			'#outage-popup-ok:hover:not(:disabled){background:var(--button-hover,#242424)}' +
			'#outage-popup-ok:disabled{opacity:.5;cursor:not-allowed}';
		document.head.appendChild(style);

		var overlay = document.createElement('div');
		overlay.id = 'outage-popup-overlay';
		overlay.setAttribute('role', 'alertdialog');
		overlay.setAttribute('aria-modal', 'true');
		overlay.setAttribute('aria-labelledby', 'outage-popup-title');

		var box = document.createElement('div');
		box.id = 'outage-popup';

		var title = document.createElement('h3');
		title.id = 'outage-popup-title';
		title.textContent = 'READ THIS PLEASE!!!!!!!!!';

		var p1 = document.createElement('p');
		p1.textContent =
			'the servers are currently down, online features (like making an account, logging in, leaderboards, cloud sync) are not avaliable as of right now!';

		var p2 = document.createElement('p');
		p2.textContent = 'please do not try to make an account, as it will ultimately fail.';

		var p3 = document.createElement('p');
		p3.textContent =
			'this is a major outage, and we are working on it ASAP, thanks for your patience!';

		var btn = document.createElement('button');
		btn.id = 'outage-popup-ok';
		btn.disabled = true;

		box.appendChild(title);
		box.appendChild(p1);
		box.appendChild(p2);
		box.appendChild(p3);
		box.appendChild(btn);
		overlay.appendChild(box);
		document.body.appendChild(overlay);

		var remaining = DELAY_SECONDS;
		btn.textContent = 'okeh (' + remaining + ')';

		var timer = setInterval(function () {
			remaining--;
			if (remaining > 0) {
				btn.textContent = 'okeh (' + remaining + ')';
			} else {
				clearInterval(timer);
				btn.textContent = 'okeh';
				btn.disabled = false;
				btn.focus();
			}
		}, 1000);

		btn.addEventListener('click', function () {
			if (btn.disabled) return;
			overlay.remove();
			style.remove();
		});

		overlay.addEventListener(
			'keydown',
			function (e) {
				if (e.key === 'Escape' || (btn.disabled && e.key === 'Enter')) {
					e.preventDefault();
					e.stopPropagation();
				}
			},
			true
		);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', show);
	} else {
		show();
	}
})();
