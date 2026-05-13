(function (root) {
  if (!root.PityTracker || !root.StreakTracker || !root.BeaconRNG) {
    throw new Error('Beacon dependencies not loaded correctly');
  }

  const VERSION = '2.0.0';
  const STORAGE_KEY = '_beacon_v2';
  const AUTOSAVE_MS = 30000;

  const _rng = new root.BeaconRNG();
  const _roller = new root.BeaconRoller(_rng);

  function _load() {
    try {
      const raw =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem(STORAGE_KEY)
          : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.rngState) && parsed.rngState.length === 4) {
          _rng.loadState(parsed.rngState);
          if (parsed.pity) _roller.pity.deserialize(parsed.pity);
          if (parsed.streak) _roller.streak.deserialize(parsed.streak);
          return;
        }
      }
    } catch (_) {}
    _rng.init();
  }

  function _save() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          rngState: _rng.getState(),
          pity: _roller.pity.serialize(),
          streak: _roller.streak.serialize(),
        }),
      );
    } catch (_) {}
  }

  _load();
  setInterval(_save, AUTOSAVE_MS);

  root.Beacon = {
    version: VERSION,

    reseed: function (seed) {
      _rng.reseed(seed);
      _save();
    },
    float: function () {
      return _rng.float();
    },
    uint64: function () {
      return _rng.uint64();
    },
    intBelow: function (n) {
      return _rng.intBelow(n);
    },
    intRange: function (lo, hi) {
      return _rng.intRange(lo, hi);
    },
    bool: function (p) {
      return _rng.bool(p);
    },
    shuffle: function (arr) {
      return _rng.shuffle(arr);
    },
    pick: function (arr) {
      return _rng.pick(arr);
    },

    roll: function (rarities, luckMult, inventory, upgrades, boostActive) {
      return _roller.roll(rarities, luckMult, inventory, upgrades, boostActive);
    },

    probabilityOf: function (
      rarity,
      rarities,
      luckMult,
      inventory,
      upgrades,
      boostActive,
    ) {
      return _roller.probabilityOf(
        rarity,
        rarities,
        luckMult,
        inventory,
        upgrades,
        boostActive,
      );
    },

    save: function () {
      _save();
    },

    debug: function () {
      return Object.assign({}, _rng.debugInfo(), {
        pity: _roller.pity.serialize(),
        streak: _roller.streak.serialize(),
      });
    },

    pity: _roller.pity,
    streak: _roller.streak,
  };

  console.log('[Beacon] v' + VERSION + ' loaded');
})(typeof window !== 'undefined' ? window : this);
