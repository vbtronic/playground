(function () {
    'use strict';

    var GAME_INFO = window.GAME_INFO || {
        title: { en: 'Game', cz: 'Hra' },
        path: 'index.html'
    };

    var lang = localStorage.getItem('lang') || 'en';
    var theme = localStorage.getItem('theme') || 'light';

    var titleEl = document.getElementById('header-title');
    var frameEl = document.getElementById('app-frame');
    var resetBtn = document.getElementById('btn-reset');
    var homeLink = document.querySelector('.home-link');
    var langOpts = document.querySelectorAll('.lang-opt');
    var themeToggle = document.getElementById('theme-toggle');
    var iconSun = themeToggle.querySelector('.icon-sun');
    var iconMoon = themeToggle.querySelector('.icon-moon');
    var homePath = window.GAME_HOME_PATH || GAME_INFO.homePath || '../../';

    function t(value) {
        if (!value || typeof value === 'string') {
            return value || '';
        }
        return value[lang] || value.en || Object.values(value)[0] || '';
    }

    function applyLang() {
        titleEl.textContent = t(GAME_INFO.title);
        if (homeLink) {
            homeLink.setAttribute('href', homePath);
        }
        langOpts.forEach(function (opt) {
            if (opt.getAttribute('data-lang') === lang) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
    }

    function applyTheme(nextTheme) {
        theme = nextTheme;
        localStorage.setItem('theme', nextTheme);
        if (nextTheme === 'dark') {
            document.body.classList.add('dark');
            iconSun.style.display = 'none';
            iconMoon.style.display = '';
        } else {
            document.body.classList.remove('dark');
            iconSun.style.display = '';
            iconMoon.style.display = 'none';
        }
    }

    function loadGame() {
        var src = GAME_INFO.path || 'index.html';
        frameEl.src = src;
    }

    langOpts.forEach(function (opt) {
        opt.addEventListener('click', function () {
            var next = this.getAttribute('data-lang');
            if (!next || next === lang) return;
            lang = next;
            localStorage.setItem('lang', next);
            applyLang();
        });
    });

    themeToggle.addEventListener('click', function () {
        applyTheme(theme === 'dark' ? 'light' : 'dark');
    });

    resetBtn.addEventListener('click', function () {
        loadGame();
    });

    window.addEventListener('message', function (event) {
        if (event.data && event.data.action === 'closeModal') {
            window.location.href = homePath;
        }
    });

    window.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && !document.querySelector('.help-modal.is-open')) {
            window.location.href = homePath;
        }
    });

    applyTheme(theme);
    applyLang();
    loadGame();
})();
