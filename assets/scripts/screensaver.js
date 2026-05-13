(function () {
  const messages = [
    'wake up',
    'theres more to come',
    'its not over yet',
    'come back',
    'gahhhhhhhhhhhhhhhhhhh',
    'fun fact about auth: shes canadian',
    'fun fact about auth: shes left handed',
    'fun fact about auth: shes chinese',
    "it's NOT okay bro",
    'something called outside',
    'hey loser wake up',
    "you're idle bro",
    'sfvszfhjksdhkshjsd',
    'heyo',
    'player please just wake up',
    'do you like rolling',
    'yo gambler how is this game going for you',
    'ahahahahahahhahaha epic',
    'im scared of math is it just me',
    'bro is auto rolling right now HAHAHAHAHAHAH',
    'did you just eat a chip',
    'oh yeah okay',
    'wake... up...',
    'hey its 2080 the world is ending',
    '*sigh*',
    'alone intelligence',
    'plugorino?? oh, no plugorino...',
    'AAAAAHHHHH AUTH IS A FEMBOY OH NOOOOOOO',
    'hm?',
    'make the sun explode already',
    'https://discord.gg/mTDw8jJYqX',
    'i love freemium apps so much that they absolutely suck',
    'ah ok',
    'running on a rope here help me',
    'music',
    'when auths rng update? no',
    'winner of the fastest update award',
    'does anyone read this?',
    'im sentient',
    'gwmdgj hkmmmmmmmmmm',
    'this is a call for help',
    'rah???',
    'join the discord server!',
    'go outside and smell the flowers and hear the birds',
    'discord mod lmao',
    'GO TO SLEEP',
    'fastest update award is given to ME',
    'mommy says im special',
    'let screensaver, textElem, idleTimer, messageTimer;',
    'please speed i need this',
    'my mom is kinda homeless',
    'WOAAAAHHHHHHHHHHHH did you do a backflip???',
    'also play terraria!',
    'slurs',
    'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    'this game was made with neocities',
    'https://authsblog.blogspot.com/',
    'stop clipfarming',
    'imagine clipfarming',
    'mommy said its your brothers turn',
    'mommy said its your sisters turn',
    'DIE',
    'your hp is now 0',
    'i wuv my mommy wahhhhhhhhhhhhhhhhhhhhhh',
    'GDEHVHUWGFSW',
    '123456789101112131415',
    'rizz',
    'im alpha sigma beta',
    'help me make this make sense',
    "shhh you're gonna wake the big one!!",
    'snarpy',
    'i started the Estrogen',
    'auth is a femboy..',
    'IM NOT A FEMBOY',
    'swear words',
    'bad words',
    'slurs',
    'Thinking...',
    "auth's RNG is actually coded by mark zuckerberg",
    'also go play... uhm... oh',
    'https://icedcubed.neocities.org',
    'i will chronically decline',
    'WHO CHRONICALLY DECLINED',
    'im watching you',
    'im behind you',
    "shhhh mommy's here",
    'cant let the boys know i listen to mommy ASMR',
    'the boys knew i listen to mommy ASMR...',
    'geometry dash ou ou ou',
    'ABORT. ABORT. ABORT.',
    'AUGHHHHHHHH THE PAINNNNNNNNNNNN',
    'stop gambling',
    'how many family members have you lost while playing this',
    'burger',
    'VITAMIN C???',
    'VITAMIN A???',
    'VITAMIN B12???',
    'this game is enough to kill a victorian child',
    'yikes............',
    'roblos',
    'american freedom baby',
    'SPIDER-',
    'club penguin my beloved',
    'i will say bad word',
    'me adding the doctype html of whatever doctype html does',
    'auths... the RNG?????',
    "its spelled auth's RNG not auths rng cmon guys",
    'LMAOOOOOOOOOO',
    'DIE IN A FIRE SCUMBAG',
    'robber games',
    'SHABANG',
    'wut the dawg doin',
    'RAHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH',
    'mincraft',
    'i used to always say REEEE when im mad... i used to be so damn cringe',
    'guys i am NOT a femboy, i am TRANS',
    'please stop calling me gay or harrass me because im trans.. please...',
    'subway',
    'imagine swearing lmao',
    'HUHHHHHHHHHHHH????????????',
  ];

  let screensaver, textElem, idleTimer, messageTimer, typeInterval;
  let screensaverActive = false;
  let usedMessages = [];
  let hue = 0;
  let hueInterval;

  function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  function createScreensaver() {
    screensaver = document.createElement('div');
    screensaver.style.cssText = `
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0e0e0e;
      z-index: 9999;
      opacity: 0;
      transition: opacity 1.5s ease;
      pointer-events: none;
    `;

    textElem = document.createElement('div');
    textElem.style.cssText = `
      font-family: monospace;
      font-size: 1.4rem;
      color: #dcdcdc;
      text-align: center;
      padding: 2rem;
      max-width: 80vw;
      opacity: 0.85;
      letter-spacing: 0.05em;
      line-height: 1.6;
    `;

    screensaver.appendChild(textElem);
    document.body.appendChild(screensaver);
  }

  function typeWriter(text) {
    textElem.textContent = '';
    let i = 0;

    clearInterval(typeInterval);

    typeInterval = setInterval(() => {
      if (i < text.length) {
        textElem.textContent += text.charAt(i);
        i++;
      } else {
        clearInterval(typeInterval);
      }
    }, 60);
  }

  function getNextMessage() {
    if (usedMessages.length === 0) {
      usedMessages = shuffleArray(messages);
    }
    return usedMessages.pop();
  }

  function randomMessage() {
    const msg = getNextMessage();
    typeWriter(msg);
  }

  function startBackgroundAnimation() {
    hue = Math.floor(Math.random() * 360);
    hueInterval = setInterval(() => {
      hue = (hue + 0.5) % 360;
      screensaver.style.background = `radial-gradient(circle at center, hsla(${hue}, 50%, 8%, 0.9), #0a0a0a)`;
    }, 80);
  }

  function stopBackgroundAnimation() {
    clearInterval(hueInterval);
    screensaver.style.background = '#0e0e0e';
  }

  function showScreensaver() {
    if (screensaverActive) return;
    screensaverActive = true;

    clearInterval(messageTimer);
    clearInterval(typeInterval);

    screensaver.style.pointerEvents = 'auto';
    screensaver.style.opacity = 1;

    startBackgroundAnimation();
    randomMessage();

    messageTimer = setInterval(randomMessage, 6000);
  }

  function hideScreensaver() {
    if (!screensaverActive) return;
    screensaverActive = false;

    screensaver.style.opacity = 0;
    screensaver.style.pointerEvents = 'none';

    clearInterval(messageTimer);
    clearInterval(typeInterval);
    stopBackgroundAnimation();

    textElem.textContent = '';
  }

  function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(showScreensaver, 120000);

    if (screensaverActive) {
      hideScreensaver();
    }
  }

  createScreensaver();

  ['mousemove', 'keydown', 'mousedown', 'touchstart', 'wheel'].forEach((evt) =>
    document.addEventListener(evt, resetIdleTimer, { passive: true }),
  );

  resetIdleTimer();
})();
