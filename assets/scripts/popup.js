window.showPrompt = function (message, defaultVal) {
  return new Promise((resolve) => {
    const existing = document.getElementById('customPopupOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'customPopupOverlay';
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:20001;display:flex;align-items:center;justify-content:center;';

    const box = document.createElement('div');
    box.style.cssText =
      'background:var(--panel-bg);border:1px solid var(--border-color);border-radius:4px;padding:28px 24px 20px;max-width:420px;width:90%;text-align:center;color:var(--text-color);font-family:monospace;';

    const p = document.createElement('div');
    p.style.cssText = 'font-size:0.9em;opacity:0.75;margin-bottom:16px;';
    p.textContent = message;
    box.appendChild(p);

    const input = document.createElement('input');
    input.type = 'text';
    input.value = defaultVal || '';
    input.style.cssText =
      'width:100%;padding:8px;background:var(--input-bg);border:1px solid var(--border-color);color:var(--text-color);font-family:monospace;border-radius:2px;margin-bottom:16px;box-sizing:border-box;';
    box.appendChild(input);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;justify-content:center;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'cancel';
    cancelBtn.style.cssText =
      'padding:8px 20px;background:transparent;border:1px solid var(--border-color);color:var(--text-color);font-family:monospace;border-radius:2px;cursor:pointer;opacity:0.6;';
    cancelBtn.addEventListener('click', () => {
      overlay.remove();
      resolve(null);
    });

    const okBtn = document.createElement('button');
    okBtn.textContent = 'ok';
    okBtn.style.cssText =
      'padding:8px 20px;background:var(--button-bg);border:1px solid var(--border-color);color:var(--text-color);font-family:monospace;border-radius:2px;cursor:pointer;';
    okBtn.addEventListener('click', () => {
      overlay.remove();
      resolve(input.value);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        overlay.remove();
        resolve(input.value);
      }
      if (e.key === 'Escape') {
        overlay.remove();
        resolve(null);
      }
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(okBtn);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    setTimeout(() => input.focus(), 50);
  });
};
