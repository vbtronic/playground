(function () {
    'use strict';

    var config = window.PLAYGROUND_CONFIG || {};
    var licenseConfig = config.license || {};
    var paymentConfig = config.payment || {};
    var routes = config.routes || {};
    var storageKey = licenseConfig.storageKey || 'playgroundTicketStatus';
    var activeValue = licenseConfig.statusValue || 'active';
    var checkoutUrl = paymentConfig.checkoutUrl || 'mailto:vb@vbtronic.com';
    var localHosts = ['localhost', '127.0.0.1'];
    var lang = localStorage.getItem('lang') || 'en';
    var theme = localStorage.getItem('theme') || 'light';
    var themeToggle = document.getElementById('theme-toggle');
    var iconSun = themeToggle ? themeToggle.querySelector('.icon-sun') : null;
    var iconMoon = themeToggle ? themeToggle.querySelector('.icon-moon') : null;
    var langOpts = document.querySelectorAll('.lang-opt');
    var isLocalPreview = (licenseConfig.allowLocalPreview !== false) && localHosts.indexOf(window.location.hostname) !== -1;

    if (new URLSearchParams(window.location.search).get('ticket') === activeValue) {
        localStorage.setItem(storageKey, activeValue);
    }

    function isLicensed() {
        return isLocalPreview || localStorage.getItem(storageKey) === activeValue;
    }

    function applyTheme(nextTheme) {
        theme = nextTheme;
        localStorage.setItem('theme', nextTheme);
        if (nextTheme === 'dark') {
            document.body.classList.add('dark');
            if (iconSun) iconSun.style.display = 'none';
            if (iconMoon) iconMoon.style.display = '';
        } else {
            document.body.classList.remove('dark');
            if (iconSun) iconSun.style.display = '';
            if (iconMoon) iconMoon.style.display = 'none';
        }
    }

    function translate() {
        document.querySelectorAll('[data-text-en]').forEach(function (node) {
            node.textContent = node.getAttribute('data-text-' + lang) || node.getAttribute('data-text-en');
        });
        document.querySelectorAll('[data-placeholder-en]').forEach(function (node) {
            node.placeholder = node.getAttribute('data-placeholder-' + lang) || node.getAttribute('data-placeholder-en');
        });
        langOpts.forEach(function (opt) {
            opt.classList.toggle('active', opt.getAttribute('data-lang') === lang);
        });
    }

    function syncAccountLinks() {
        var account = window.PlaygroundAccount && window.PlaygroundAccount.getSession ? window.PlaygroundAccount.getSession() : null;
        document.querySelectorAll('.js-account-link').forEach(function (node) {
            node.textContent = account ? (account.name || account.email || 'Account') : 'Log in';
            node.href = routes.account || 'account/';
        });
        document.querySelectorAll('.js-account-chip').forEach(function (node) {
            node.textContent = account ? (account.provider === 'google' ? 'Google account connected' : 'Local account active') : 'Guest mode';
        });
    }

    function syncTicketUI() {
        var licensed = isLicensed();
        var price = Number(licenseConfig.monthlyPriceEur || 7.9).toFixed(2);
        var label = licensed ? (isLocalPreview ? 'Local preview unlocked' : 'Ticket active') : 'Ticket required';
        document.querySelectorAll('.js-price').forEach(function (node) {
            node.textContent = '€' + price + ' / month';
        });
        document.querySelectorAll('.js-ticket-status').forEach(function (node) {
            node.textContent = label;
            node.classList.toggle('status-good', licensed);
            node.classList.toggle('status-warn', !licensed);
        });
        document.querySelectorAll('.js-buy-link').forEach(function (node) {
            node.href = checkoutUrl;
        });
        document.querySelectorAll('.js-product-link').forEach(function (node) {
            var liveHref = node.getAttribute('data-href');
            var previewHref = node.getAttribute('data-preview');
            if (licensed && liveHref) {
                node.href = liveHref;
                node.textContent = node.getAttribute('data-live-label') || 'Open now';
            } else if (previewHref) {
                node.href = previewHref;
                node.textContent = node.getAttribute('data-preview-label') || 'Watch preview video';
            }
        });
    }

    function injectToday() {
        document.querySelectorAll('.js-today').forEach(function (node) {
            node.textContent = new Intl.DateTimeFormat('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }).format(new Date());
        });
    }

    langOpts.forEach(function (opt) {
        opt.addEventListener('click', function () {
            var next = this.getAttribute('data-lang');
            if (!next || next === lang) return;
            lang = next;
            localStorage.setItem('lang', next);
            translate();
        });
    });

    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            applyTheme(theme === 'dark' ? 'light' : 'dark');
        });
    }

    applyTheme(theme);
    translate();
    injectToday();
    syncAccountLinks();
    syncTicketUI();

    window.addEventListener('storage', function (event) {
        if (event.key === storageKey) syncTicketUI();
        if (window.PlaygroundAccount && event.key === (config.auth && config.auth.sessionStorageKey)) syncAccountLinks();
        if (event.key === 'theme') applyTheme(localStorage.getItem('theme') || 'light');
        if (event.key === 'lang') {
            lang = localStorage.getItem('lang') || 'en';
            translate();
        }
    });
})();
