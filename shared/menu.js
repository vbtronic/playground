(function () {
    'use strict';

    var config = window.PLAYGROUND_CONFIG || {};
    var routes = config.routes || {};
    var licenseConfig = config.license || {};
    var basePath = window.PLAYGROUND_MENU_ROOT || './';
    var session = window.PlaygroundAccount && window.PlaygroundAccount.getSession ? window.PlaygroundAccount.getSession() : null;
    var storageKey = licenseConfig.storageKey || 'playgroundTicketStatus';
    var localHosts = ['localhost', '127.0.0.1'];
    var isLocalPreview = (licenseConfig.allowLocalPreview !== false) && localHosts.indexOf(window.location.hostname) !== -1;
    var ticketActive = isLocalPreview || localStorage.getItem(storageKey) === (licenseConfig.statusValue || 'active');

    function rootPath(route) {
        return basePath + route;
    }

    function buildLink(label, href, chip) {
        return '<a class="menu-link" href="' + href + '"><span>' + label + '</span>' + (chip ? '<span class="menu-chip">' + chip + '</span>' : '') + '</a>';
    }

    function buildProduct(product) {
        return '<a class="menu-product-link" href="' + rootPath(ticketActive ? product.path : product.previewPath) + '"><span>' + product.name + '</span><span class="menu-chip">' + (ticketActive ? 'Open' : 'Preview') + '</span></a>';
    }

    function openDrawer() {
        overlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
        overlay.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    var button = document.createElement('button');
    button.type = 'button';
    button.className = document.querySelector('header') ? 'menu-drawer-button' : 'menu-toggle-fixed';
    button.setAttribute('aria-label', 'Open menu');
    button.textContent = '☰';

    if (document.querySelector('header')) {
        document.querySelector('header').insertBefore(button, document.querySelector('header').firstChild);
    } else {
        document.body.appendChild(button);
    }

    var overlay = document.createElement('div');
    overlay.className = 'menu-drawer-overlay';
    overlay.innerHTML =
        '<aside class="menu-drawer" role="dialog" aria-label="Playground menu">' +
            '<div class="menu-head">' +
                '<div class="menu-brand">' +
                    '<strong>' + (config.brand && config.brand.name ? config.brand.name : 'Playground') + '</strong>' +
                    '<span>Built by ' + (config.brand && config.brand.author ? config.brand.author : 'Viktor Brunclik') + ' with ' + (config.brand && config.brand.builtWith ? config.brand.builtWith : 'Claude Code and Amp') + '</span>' +
                '</div>' +
                '<button class="menu-close" type="button" aria-label="Close menu">×</button>' +
            '</div>' +
            '<section class="menu-group">' +
                '<h2>Home</h2>' +
                '<p>Today in Playground: one shared visual system, one ticket, and a cleaner launch path.</p>' +
                '<div class="menu-links">' +
                    buildLink('Home', rootPath(routes.home || 'index.html')) +
                    buildLink(session ? 'Account overview' : 'Log in', rootPath(routes.account || 'account/'), session ? 'Active' : 'Guest') +
                    buildLink('Privacy Policy', rootPath(routes.privacyPolicy || 'privacy-policy/')) +
                    buildLink('Cookie Policy', rootPath(routes.cookiePolicy || 'cookie-policy/')) +
                    buildLink('Terms of Service', rootPath(routes.termsOfService || 'terms-of-service/')) +
                '</div>' +
            '</section>' +
            '<section class="menu-group">' +
                '<h2>Applications</h2>' +
                '<p>More applications are in progress.</p>' +
                '<div class="menu-products">' + (config.products || []).map(buildProduct).join('') + '</div>' +
            '</section>' +
            '<section class="menu-group">' +
                '<h2>Contact</h2>' +
                '<p>Reach the studio directly at ' + ((config.contact && config.contact.email) || 'vb@vbtronic.com') + '.</p>' +
                '<div class="menu-links">' +
                    buildLink('Contact page', rootPath(routes.contact || 'contact/')) +
                    buildLink('Email ' + ((config.contact && config.contact.email) || 'vb@vbtronic.com'), 'mailto:' + ((config.contact && config.contact.email) || 'vb@vbtronic.com')) +
                '</div>' +
            '</section>' +
            '<section class="menu-group">' +
                '<h2>Buy the ticket</h2>' +
                '<p>' + (licenseConfig.planName || 'Playground Ticket') + ' is ' + (ticketActive ? 'already active on this browser.' : 'required to unlock all interactive products on the live site.') + '</p>' +
                '<div class="menu-links">' +
                    buildLink('Buy the ticket', rootPath(routes.buyTicket || 'buy-ticket/'), '€' + Number(licenseConfig.monthlyPriceEur || 7.9).toFixed(2) + '/mo') +
                '</div>' +
            '</section>' +
            '<section class="menu-group">' +
                '<h2>Account</h2>' +
                '<p>' + (session ? ('Signed in as ' + (session.name || session.email || 'account owner') + '.') : 'You are browsing as a guest.') + '</p>' +
                '<div class="menu-links">' +
                    buildLink('Account page', rootPath(routes.account || 'account/'), session ? (session.provider === 'google' ? 'Google' : 'Local') : 'Guest') +
                    (session ? '<button class="menu-action" type="button" id="menu-sign-out"><span>Sign out</span><span class="menu-chip">Now</span></button>' : '') +
                '</div>' +
            '</section>' +
        '</aside>';
    document.body.appendChild(overlay);

    button.addEventListener('click', openDrawer);
    overlay.addEventListener('click', function (event) {
        if (event.target === overlay) closeDrawer();
    });
    overlay.querySelector('.menu-close').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeDrawer();
    });

    var signOutBtn = overlay.querySelector('#menu-sign-out');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', function () {
            if (window.PlaygroundAccount && window.PlaygroundAccount.signOut) {
                window.PlaygroundAccount.signOut();
            }
            window.location.href = rootPath(routes.account || 'account/');
        });
    }

    if (window.PLAYGROUND_HELP) {
        var helpButton = document.createElement('button');
        helpButton.type = 'button';
        helpButton.className = 'header-btn';
        helpButton.id = 'btn-help';
        helpButton.textContent = 'Help';
        var headerRight = document.querySelector('.header-right');
        if (headerRight) {
            headerRight.insertBefore(helpButton, headerRight.firstChild);
        }

        var helpModal = document.createElement('div');
        helpModal.className = 'menu-help-modal';
        helpModal.innerHTML =
            '<div class="menu-help-card">' +
                '<div class="menu-head">' +
                    '<div class="menu-brand">' +
                        '<strong>' + (window.PLAYGROUND_HELP.title || 'Help') + '</strong>' +
                        '<span>' + (window.PLAYGROUND_HELP.subtitle || '') + '</span>' +
                    '</div>' +
                    '<button class="menu-close" type="button" aria-label="Close help">×</button>' +
                '</div>' +
                ((window.PLAYGROUND_HELP.sections || []).map(function (section) {
                    var items = (section.items || []).map(function (item) {
                        return '<li>' + item + '</li>';
                    }).join('');
                    return '<section><h3>' + section.heading + '</h3>' + (section.text ? '<p>' + section.text + '</p>' : '') + (items ? '<ul>' + items + '</ul>' : '') + '</section>';
                }).join('')) +
            '</div>';
        document.body.appendChild(helpModal);

        helpButton.addEventListener('click', function () {
            helpModal.classList.add('is-open');
        });
        helpModal.addEventListener('click', function (event) {
            if (event.target === helpModal) helpModal.classList.remove('is-open');
        });
        helpModal.querySelector('.menu-close').addEventListener('click', function () {
            helpModal.classList.remove('is-open');
        });
    }
})();
