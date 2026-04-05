(function () {
    'use strict';

    var config = window.PLAYGROUND_CONFIG || {};
    var licenseConfig = config.license || {};
    var paymentConfig = config.payment || {};
    var storageKey = licenseConfig.storageKey || 'playgroundGamesLicense';
    var activeValue = licenseConfig.statusValue || 'active';
    var price = Number(licenseConfig.monthlyPriceEur || 14.9).toFixed(2);
    var planName = licenseConfig.planName || 'Studio Games Pass';
    var title = window.GAME_LICENSE_TITLE || document.title || 'This game';
    var homePath = window.GAME_LICENSE_HOME_PATH || '../index.html#buy-games';
    var buyPath = window.GAME_LICENSE_BUY_PATH || homePath;
    var contactEmail = (config.contact && config.contact.email) || 'vb@vbtronic.com';
    var allowLocalPreview = licenseConfig.allowLocalPreview !== false;
    var localHosts = ['localhost', '127.0.0.1'];
    var isLocalPreview = allowLocalPreview && localHosts.indexOf(window.location.hostname) !== -1;
    var isRequired = window.GAME_LICENSE_REQUIRED !== false;

    if (!isRequired) {
        return;
    }

    if (new URLSearchParams(window.location.search).get('license') === activeValue) {
        localStorage.setItem(storageKey, activeValue);
    }

    if (isLocalPreview || localStorage.getItem(storageKey) === activeValue) {
        return;
    }

    var style = document.createElement('style');
    style.textContent = [
        '.license-gate-overlay {',
        '  position: absolute;',
        '  inset: 0;',
        '  z-index: 120;',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: center;',
        '  padding: 24px;',
        '  background: rgba(10, 14, 24, 0.58);',
        '  backdrop-filter: blur(18px);',
        '  -webkit-backdrop-filter: blur(18px);',
        '}',
        '.license-gate-card {',
        '  width: min(520px, 100%);',
        '  padding: 22px;',
        '  border-radius: 16px;',
        '  border: 1px solid rgba(255, 255, 255, 0.12);',
        '  background: rgba(15, 19, 28, 0.92);',
        '  color: #f7fbff;',
        '  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.32);',
        '}',
        '.license-gate-card h2 {',
        '  margin: 0 0 8px;',
        '  font-size: clamp(1.35rem, 2vw, 1.7rem);',
        '  line-height: 1.05;',
        '  letter-spacing: -0.03em;',
        '}',
        '.license-gate-card p {',
        '  margin: 0;',
        '  color: rgba(235, 242, 255, 0.78);',
        '  line-height: 1.6;',
        '}',
        '.license-gate-price {',
        '  display: inline-flex;',
        '  margin: 14px 0 12px;',
        '  padding: 7px 12px;',
        '  border-radius: 999px;',
        '  background: rgba(110, 142, 247, 0.16);',
        '  color: #c8d6ff;',
        '  font-size: 12px;',
        '  font-weight: 600;',
        '  letter-spacing: 0.04em;',
        '  text-transform: uppercase;',
        '}',
        '.license-gate-actions {',
        '  display: flex;',
        '  flex-wrap: wrap;',
        '  gap: 10px;',
        '  margin-top: 18px;',
        '}',
        '.license-gate-btn {',
        '  display: inline-flex;',
        '  align-items: center;',
        '  justify-content: center;',
        '  min-height: 38px;',
        '  padding: 0 14px;',
        '  border-radius: 999px;',
        '  border: 1px solid rgba(255, 255, 255, 0.12);',
        '  text-decoration: none;',
        '  font-size: 12px;',
        '  font-weight: 600;',
        '  letter-spacing: 0.02em;',
        '}',
        '.license-gate-btn.primary {',
        '  background: linear-gradient(135deg, #4568ee, #71a0ff);',
        '  border-color: rgba(151, 179, 255, 0.48);',
        '  color: #ffffff;',
        '}',
        '.license-gate-btn.secondary {',
        '  background: rgba(255, 255, 255, 0.04);',
        '  color: #e7eefb;',
        '}',
        '.license-gate-note {',
        '  margin-top: 12px;',
        '  font-size: 12px;',
        '  color: rgba(211, 221, 240, 0.72);',
        '}',
        '.license-gate-note a {',
        '  color: #cfe0ff;',
        '}',
        '@media (max-width: 640px) {',
        '  .license-gate-overlay { padding: 16px; }',
        '  .license-gate-card { padding: 18px; }',
        '  .license-gate-actions { flex-direction: column; }',
        '  .license-gate-btn { width: 100%; }',
        '}',
    ].join('\n');
    document.head.appendChild(style);

    var container = document.querySelector(window.GAME_GATE_CONTAINER_SELECTOR || '.app-stage') ||
        document.getElementById('game-container') ||
        document.getElementById('game') ||
        document.body;

    if (container !== document.body) {
        var computed = window.getComputedStyle(container).position;
        if (computed === 'static') {
            container.style.position = 'relative';
        }
    }

    var frame = document.getElementById('app-frame');
    if (frame) {
        frame.style.visibility = 'hidden';
    }

    var overlay = document.createElement('div');
    overlay.className = 'license-gate-overlay';
    overlay.innerHTML =
        '<div class="license-gate-card">' +
            '<h2>' + title + ' is part of the paid games catalog</h2>' +
            '<p>You need an active monthly license before this game becomes playable on the live site. Local preview stays open so development and QA remain fast.</p>' +
            '<div class="license-gate-price">' + planName + ' · €' + price + ' / month</div>' +
            '<div class="license-gate-actions">' +
                '<a class="license-gate-btn primary" href="' + buyPath + '">Buy games access</a>' +
                '<a class="license-gate-btn secondary" href="mailto:' + contactEmail + '?subject=Playground%20Games%20License">Contact ' + contactEmail + '</a>' +
            '</div>' +
            '<p class="license-gate-note">Payment placeholders are already wired through the shared config. Replace the current checkout link with your Stripe or server checkout URL before going live.</p>' +
        '</div>';

    container.appendChild(overlay);

    if (frame) {
        frame.setAttribute('aria-hidden', 'true');
    }
})();
