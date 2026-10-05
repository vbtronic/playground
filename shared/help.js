// Adds a "Help" button to the app header and a bilingual help modal.
// Configure via window.PLAYGROUND_HELP = { title, subtitle, sections: [{ heading, text, items }] },
// where every string may be either plain text or { en, cz }.
(function () {
    'use strict';

    var help = window.PLAYGROUND_HELP;
    var headerRight = document.querySelector('.header-right');
    if (!help || !headerRight) return;

    function lang() {
        return localStorage.getItem('lang') || 'en';
    }

    function t(value) {
        if (!value || typeof value === 'string') return value || '';
        return value[lang()] || value.en || '';
    }

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'header-btn help-btn';
    button.id = 'btn-help';
    button.setAttribute('aria-haspopup', 'dialog');
    headerRight.insertBefore(button, headerRight.firstChild);

    var modal = document.createElement('div');
    modal.className = 'help-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    document.body.appendChild(modal);

    function render() {
        button.textContent = lang() === 'cz' ? 'Nápověda' : 'Help';
        modal.innerHTML =
            '<div class="help-card">' +
                '<div class="help-head">' +
                    '<div><h2>' + t(help.title) + '</h2>' +
                    (help.subtitle ? '<p>' + t(help.subtitle) + '</p>' : '') + '</div>' +
                    '<button class="help-close" type="button" aria-label="Close">&times;</button>' +
                '</div>' +
                (help.sections || []).map(function (section) {
                    var items = (section.items || []).map(function (item) {
                        return '<li>' + t(item) + '</li>';
                    }).join('');
                    return '<section><h3>' + t(section.heading) + '</h3>' +
                        (section.text ? '<p>' + t(section.text) + '</p>' : '') +
                        (items ? '<ul>' + items + '</ul>' : '') + '</section>';
                }).join('') +
            '</div>';
        modal.querySelector('.help-close').addEventListener('click', close);
    }

    function open() {
        render();
        modal.classList.add('is-open');
    }

    function close() {
        modal.classList.remove('is-open');
    }

    button.addEventListener('click', open);
    modal.addEventListener('click', function (e) {
        if (e.target === modal) close();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
    });
    document.querySelectorAll('.lang-opt').forEach(function (opt) {
        opt.addEventListener('click', function () {
            // Let the page's own handler store the new language first
            setTimeout(render, 0);
        });
    });

    render();
})();
