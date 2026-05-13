window.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    .entry-container {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: #0e0e0e;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      opacity: 1;
      transition: opacity 1.2s ease;
    }

    .tap-text {
      position: absolute;
      bottom: 8%;
      color: #dcdcdc;
      font-size: 0.9em;
      font-family: monospace;
      letter-spacing: 0.08em;
      opacity: 0;
      animation: fadein 1.5s ease forwards 0.8s, pulse 2s ease-in-out infinite 2.5s;
      user-select: none;
      text-transform: lowercase;
    }

    @keyframes fadein {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 0.6; transform: translateY(0); }
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 0.25; }
    }

    .center-line {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 1px;
      height: 1px;
      background: #dcdcdc;
      transform: translate(-50%, -50%);
      opacity: 0.8;
      transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .expand-horizontal {
      width: 100%;
      height: 1px;
    }

    .expand-vertical {
      width: 100%;
      height: 100%;
    }

    .fade-line {
      animation: fade-line 0.6s ease forwards;
    }

    @keyframes fade-line {
      from { opacity: 0.8; }
      to { opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  const container = document.createElement('div');
  container.className = 'entry-container';
  container.innerHTML = `
    <div class="center-line"></div>
    <div class="tap-text">click/tap to wake up...</div>
  `;
  document.body.appendChild(container);

  const line = container.querySelector('.center-line');
  const text = container.querySelector('.tap-text');

  function startSequence() {
    text.style.display = 'none';

    line.classList.add('expand-horizontal');

    setTimeout(() => {
      line.classList.add('expand-vertical');

      setTimeout(() => {
        line.classList.add('fade-line');

        setTimeout(() => {
          container.style.opacity = '0';
          setTimeout(() => container.remove(), 1200);
        }, 600);
      }, 800);
    }, 800);
  }

  container.addEventListener('click', startSequence, { once: true });
  container.addEventListener('touchstart', startSequence, { once: true });
});
