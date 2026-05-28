// BORINGGG
//but i gotta do this nonetheless

console.log(performance.now());

(function () {
	const SEEN_KEY = 'seenLegalConsent';
	if (localStorage.getItem(SEEN_KEY)) return;

	const style = document.createElement('style');
	style.textContent = `
#legalConsentPopup {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
}
#legalConsentPopup.hidden { display: none; }
#legalConsentInner {
  background: var(--panel-bg, #111);
  border: 1px solid var(--border-color, #2a2a2a);
  border-radius: 4px;
  padding: 28px;
  max-width: 420px;
  width: 90%;
  position: relative;
  color: var(--text-color, #dcdcdc);
  font-family: monospace;
  line-height: 1.6;
}
#legalConsentInner p {
  margin: 0 0 20px 0;
  font-size: 0.9em;
  opacity: 0.88;
}
#legalConsentInner a {
  color: var(--text-color, #dcdcdc);
  text-decoration: none;
  border-bottom: 1px dotted #ffb86b;
  color: #ffb86b;
  transition: opacity 0.15s;
}
#legalConsentInner a:hover { opacity: 0.7; }
#legalConsentDismiss {
  display: block;
  width: 100%;
  padding: 10px;
  background: var(--button-bg, #1a1a1a);
  border: 1px solid var(--border-color, #2a2a2a);
  border-radius: 2px;
  color: var(--text-color, #dcdcdc);
  font-family: monospace;
  font-size: 0.9em;
  cursor: pointer;
  transition: background 0.15s;
}
#legalConsentDismiss:hover { background: #222; }
`;
	document.head.appendChild(style);

	const popup = document.createElement('div');
	popup.id = 'legalConsentPopup';
	popup.innerHTML = `
    <div id="legalConsentInner">
      <p>by continuing, you agree to the game's <a href="/boring/legal" target="_blank">privacy policy and terms of service</a>. you have rights, and your privacy is ensured!</p>
      <button id="legalConsentDismiss">okay, got it!!</button>
    </div>
  `;
	document.body.appendChild(popup); // why do i have to make so many JS scripts ahhhhhhhhhhhh

	document.getElementById('legalConsentDismiss').addEventListener('click', function () {
		localStorage.setItem(SEEN_KEY, '1');
		popup.classList.add('hidden');
	});
})();
