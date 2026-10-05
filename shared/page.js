// Theme + language handling for static pages.
// Elements with data-en / data-cz attributes get their text swapped on language change.
(function () {
    'use strict';

    var lang = localStorage.getItem('lang') || 'en';
    var theme = localStorage.getItem('theme') || 'light';
    var themeToggle = document.getElementById('theme-toggle');
    var langOpts = document.querySelectorAll('.lang-opt');

    function applyTheme(next) {
        theme = next === 'dark' ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        document.body.classList.toggle('dark', theme === 'dark');
        if (!themeToggle) return;
        themeToggle.querySelector('.icon-sun').style.display = theme === 'dark' ? 'none' : '';
        themeToggle.querySelector('.icon-moon').style.display = theme === 'dark' ? '' : 'none';
    }

    function applyLang(next) {
        lang = next === 'cz' ? 'cz' : 'en';
        localStorage.setItem('lang', lang);
        document.documentElement.lang = lang === 'cz' ? 'cs' : 'en';
        document.querySelectorAll('[data-en]').forEach(function (node) {
            node.textContent = node.getAttribute('data-' + lang) || node.getAttribute('data-en');
        });
        langOpts.forEach(function (opt) {
            opt.classList.toggle('active', opt.getAttribute('data-lang') === lang);
        });
    }

    langOpts.forEach(function (opt) {
        opt.addEventListener('click', function () {
            applyLang(opt.getAttribute('data-lang'));
        });
    });

    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            applyTheme(theme === 'dark' ? 'light' : 'dark');
        });
    }

    window.addEventListener('storage', function (e) {
        if (e.key === 'theme') applyTheme(e.newValue);
        if (e.key === 'lang') applyLang(e.newValue);
    });

    applyTheme(theme);
    applyLang(lang);
})();
