'use strict';

(function () {
  const API = 'https://backup.authsrng.xyz/api/backup';

  const SAVE_KEYS = [
    'rarityInventory',
    'totalRolls',
    'achievementsUnlocked',
    'anomalies',
    'anomaliesUsed',
    'shopPoints',
    'shopUpgrades',
    'soldOutRarities',
    'playerPotions',
    'activePotions',
    'wishingWell',
    'luckBoostState',
    'totalPlaytime',
    'daily_lastClaim',
    'daily_streak',
    'weekly_lastClaim',
    'weekly_streak',
    'gauntletData',
    'mutationsUnlocked',
  ];

  const AGREEMENT_TEXT = `auth's RNG CLOUD BACKUP - TERMS OF USE

By clicking OK, you agree to the following:

- Your game save data will be stored on a server maintained by auth, the developer of auth's RNG.
- Your data is identified only by a randomly generated ID stored in your browser. No account, email address, or personal information is collected or required.
- We will NEVER sell, share, rent, or distribute your data to any third party, for any reason, ever.
- Cloud backups are provided as-is. We make no uptime guarantee. Backups can be lost due to server failure or maintenance. Keep local backups too in case something goes incredibly wrong on our end.
- You can delete your cloud backup at any time from the settings page.
- Your backup key is the random ID stored in your browser's localStorage. If you clear localStorage without noting it down, you will lose access to your cloud backup.

Click OK to accept and enable cloud backups.`;

  function uid_hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  function bundle() {
    const obj = {};
    SAVE_KEYS.forEach((k) => {
      const v = localStorage.getItem(k);
      if (v !== null) obj[k] = v;
    });
    return obj;
  }

  function encode(b) {
    const payload = JSON.stringify(b);
    const env = JSON.stringify({ p: payload, h: uid_hash(payload), t: 'save' });
    return btoa(unescape(encodeURIComponent(env)));
  }

  function decode(input) {
    let env;
    try {
      env = JSON.parse(decodeURIComponent(escape(atob(input.trim()))));
    } catch {
      return { error: 'corrupted data' };
    }
    if (!env?.p || !env?.h || !env?.t) return { error: 'invalid format' };
    if (env.t !== 'save') return { error: 'wrong type' };
    if (uid_hash(env.p) !== env.h) return { error: 'tampered or corrupted' };
    try {
      return { bundle: JSON.parse(env.p) };
    } catch {
      return { error: 'bad json' };
    }
  }

  function getUid() {
    let uid = localStorage.getItem('cloudBackupUid');
    const valid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uid || !valid.test(uid)) {
      uid = crypto.randomUUID();
      localStorage.setItem('cloudBackupUid', uid);
    }
    return uid;
  }

  function isEnabled() {
    return localStorage.getItem('cloudBackupEnabled') === 'true';
  }

  function setEnabled(v) {
    localStorage.setItem('cloudBackupEnabled', String(v));
  }

  function getAutoInterval() {
    return localStorage.getItem('cloudBackupInterval') || '15m';
  }

  function setStatus(msg, color) {
    const el = document.getElementById('cloudBackupStatus');
    if (!el) return;
    el.textContent = msg;
    el.style.color = color || '';
  }

  function setLastBackupDisplay(ts) {
    const el = document.getElementById('cloudLastBackup');
    if (!el) return;
    el.textContent = ts
      ? 'last backup: ' + new Date(ts).toLocaleString()
      : 'no backup yet';
  }

  async function doBackup(silent) {
    const uid = getUid();
    const payload = encode(bundle());
    if (!silent) setStatus('backing up...', '');

    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, payload }),
      });
      const data = await r.json();
      if (!r.ok) {
        if (!silent) setStatus('error: ' + (data.error || r.status), '#ff8888');
        return false;
      }
      localStorage.setItem('lastCloudBackup', data.ts);
      setLastBackupDisplay(data.ts);
      if (!silent)
        setStatus(
          'backed up at ' + new Date(data.ts).toLocaleString(),
          '#88dd88',
        );
      return true;
    } catch (e) {
      if (!silent) setStatus('backup failed: ' + e.message, '#ff8888');
      return false;
    }
  }

  async function doRestore() {
    const uid = getUid();
    if (
      !confirm(
        'restore from cloud? this will overwrite your current save. are you sure?',
      )
    )
      return;

    setStatus('restoring...', '');
    try {
      const r = await fetch(API + '/' + uid);
      const data = await r.json();
      if (!r.ok || !data.payload) {
        setStatus('error: ' + (data.error || 'no backup found'), '#ff8888');
        return;
      }
      const result = decode(data.payload);
      if (result.error) {
        setStatus('restore error: ' + result.error, '#ff8888');
        return;
      }
      Object.keys(result.bundle).forEach((k) =>
        localStorage.setItem(k, result.bundle[k]),
      );
      setStatus('restored! reloading...', '#88dd88');
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      setStatus('restore failed: ' + e.message, '#ff8888');
    }
  }

  async function doDelete() {
    const uid = getUid();
    if (
      !confirm('permanently delete your cloud backup? this cannot be undone.')
    )
      return;

    setStatus('deleting...', '');
    try {
      const r = await fetch(API + '/' + uid, {
        method: 'DELETE',
        headers: { 'X-Backup-Key': uid },
      });
      const data = await r.json();
      if (!r.ok) {
        setStatus('error: ' + (data.error || r.status), '#ff8888');
        return;
      }
      localStorage.removeItem('lastCloudBackup');
      setLastBackupDisplay(null);
      setStatus('cloud backup deleted.', '#aaa');
    } catch (e) {
      setStatus('delete failed: ' + e.message, '#ff8888');
    }
  }

  let autoTimer = null;

  function startAutoBackup() {
    clearInterval(autoTimer);
    autoTimer = null;
    if (!isEnabled()) return;
    const ms = getAutoInterval() === '2h' ? 2 * 60 * 60 * 1000 : 15 * 60 * 1000;
    autoTimer = setInterval(() => {
      if (!document.hidden) doBackup(true);
    }, ms);
  }

  function buildUI() {
    const section = document.getElementById('cloudBackupSection');
    if (!section) return;

    if (!isEnabled()) {
      section.innerHTML = `
      <button id="enableCloudBackupBtn" class="small" style="width:100%;margin-top:4px;">enable cloud backups</button>
      <small class="helper" style="margin-top:6px;">opt-in — your save, stored remotely. agreement required.</small>
    `;
      document
        .getElementById('enableCloudBackupBtn')
        .addEventListener('click', async () => {
          const agreed = confirm(AGREEMENT_TEXT);
          if (!agreed) return;
          localStorage.setItem('cloudBackupAgreed', 'true');
          setEnabled(true);
          buildUI();
          startAutoBackup();
          doBackup(false);
        });
      return;
    }

    const lastTs = localStorage.getItem('lastCloudBackup');
    const lastStr = lastTs
      ? 'last backup: ' + new Date(parseInt(lastTs)).toLocaleString()
      : 'no backup yet';
    const iv = getAutoInterval();
    const uid = getUid();
    const maskedUid = uid.slice(0, 8) + '...' + uid.slice(-4);

    section.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span style="font-size:0.85em;opacity:0.8;">cloud backups: <span style="color:#88dd88;">on</span></span>
      <button id="disableCloudBackupBtn" class="small" style="opacity:0.5;">disable</button>
    </div>
    <div id="cloudLastBackup" style="font-size:0.8em;opacity:0.5;margin-bottom:10px;">${lastStr}</div>
    <label style="display:block;font-size:0.85em;margin-bottom:4px;">auto-backup interval:</label>
    <select id="cloudIntervalSelect" style="width:100%;margin-bottom:10px;">
      <option value="15m"${iv === '15m' ? ' selected' : ''}>every 15 minutes</option>
      <option value="2h"${iv === '2h' ? ' selected' : ''}>every 2 hours</option>
    </select>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
      <button id="cloudBackupNowBtn" class="small">backup now</button>
      <button id="cloudRestoreBtn" class="small">restore from cloud</button>
      <button id="cloudDeleteBtn" class="small" style="opacity:0.5;color:#ff8888;">delete backup</button>
    </div>
    <div id="cloudBackupStatus" style="font-size:0.8em;min-height:1.2em;margin-bottom:6px;"></div>
    <small class="helper">backup key: <span title="${uid}" style="opacity:0.4;font-size:0.9em;">${maskedUid}</span>
      <button id="copyUidBtn" class="small" style="padding:2px 6px;font-size:0.75em;margin-left:4px;">copy</button>
    </small>
  `;

    document
      .getElementById('disableCloudBackupBtn')
      .addEventListener('click', () => {
        if (
          !confirm(
            'disable cloud backups? your existing cloud data will not be deleted.',
          )
        )
          return;
        setEnabled(false);
        clearInterval(autoTimer);
        autoTimer = null;
        buildUI();
      });

    document
      .getElementById('cloudIntervalSelect')
      .addEventListener('change', (e) => {
        localStorage.setItem('cloudBackupInterval', e.target.value);
        startAutoBackup();
      });

    document
      .getElementById('cloudBackupNowBtn')
      .addEventListener('click', () => doBackup(false));
    document
      .getElementById('cloudRestoreBtn')
      .addEventListener('click', doRestore);
    document
      .getElementById('cloudDeleteBtn')
      .addEventListener('click', doDelete);

    document.getElementById('copyUidBtn').addEventListener('click', () => {
      navigator.clipboard
        .writeText(uid)
        .then(() => setStatus('backup key copied!', '#aaa'));
    });
  }

  function init() {
    buildUI();
    if (isEnabled()) startAutoBackup();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
