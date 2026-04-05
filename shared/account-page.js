(function () {
    'use strict';

    var config = window.PLAYGROUND_CONFIG || {};
    var authConfig = config.auth || {};
    var statusBox = document.getElementById('account-status');
    var signOutBtn = document.getElementById('sign-out');
    var loginForm = document.getElementById('login-form');
    var signupForm = document.getElementById('signup-form');
    var googleMount = document.getElementById('google-signin');
    var googleNote = document.getElementById('google-note');

    function renderSession(message) {
        var session = window.PlaygroundAccount.getSession();
        if (session) {
            statusBox.innerHTML = '<strong>Signed in</strong><p>' + (session.name || session.email) + ' · ' + session.email + ' · ' + session.provider + '</p>' + (message ? '<div class="message-box">' + message + '</div>' : '');
            signOutBtn.hidden = false;
        } else {
            statusBox.innerHTML = '<strong>Guest mode</strong><p>You are not signed in yet. Use Google or create a local account below.</p>' + (message ? '<div class="message-box">' + message + '</div>' : '');
            signOutBtn.hidden = true;
        }
    }

    function showMessage(message, isError) {
        renderSession((isError ? '<span class="status-danger">' : '<span class="status-good">') + message + '</span>');
    }

    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        var form = new FormData(loginForm);
        try {
            await window.PlaygroundAccount.signIn({
                email: form.get('email'),
                password: form.get('password')
            });
            loginForm.reset();
            renderSession('Signed in successfully.');
        } catch (error) {
            showMessage(error.message, true);
        }
    });

    signupForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        var form = new FormData(signupForm);
        try {
            await window.PlaygroundAccount.signUp({
                name: form.get('name'),
                email: form.get('email'),
                password: form.get('password')
            });
            signupForm.reset();
            renderSession('Account created and signed in.');
        } catch (error) {
            showMessage(error.message, true);
        }
    });

    signOutBtn.addEventListener('click', function () {
        window.PlaygroundAccount.signOut();
        renderSession('Signed out.');
    });

    function initGoogle() {
        var clientId = authConfig.googleClientId || '';
        if (!clientId || clientId.indexOf('YOUR_') === 0) {
            googleNote.textContent = 'Set a real Google client ID in .env and playground-config.js to activate Google sign-in.';
            googleMount.innerHTML = '<button class="btn-ghost" type="button" disabled>Google sign-in needs setup</button>';
            return;
        }

        if (!window.google || !window.google.accounts || !window.google.accounts.id) {
            googleNote.textContent = 'Loading Google sign-in...';
            setTimeout(initGoogle, 300);
            return;
        }

        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: function (response) {
                var profile = window.PlaygroundAccount.decodeJwt(response.credential);
                window.PlaygroundAccount.signInWithGoogleProfile(profile);
                renderSession('Signed in with Google.');
            }
        });
        window.google.accounts.id.renderButton(googleMount, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'pill'
        });
        googleNote.textContent = 'Google sign-in is ready when the client ID is configured.';
    }

    renderSession();
    initGoogle();
})();
