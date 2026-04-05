(function () {
    'use strict';

    var config = window.PLAYGROUND_CONFIG || {};
    var authConfig = config.auth || {};
    var sessionKey = authConfig.sessionStorageKey || 'playgroundAccountSession';
    var usersKey = authConfig.usersStorageKey || 'playgroundLocalAccounts';

    function parseJSON(value, fallback) {
        if (!value) return fallback;
        try {
            return JSON.parse(value);
        } catch (error) {
            return fallback;
        }
    }

    function getUsers() {
        return parseJSON(localStorage.getItem(usersKey), []);
    }

    function saveUsers(users) {
        localStorage.setItem(usersKey, JSON.stringify(users));
    }

    function getSession() {
        return parseJSON(localStorage.getItem(sessionKey), null);
    }

    function saveSession(session) {
        localStorage.setItem(sessionKey, JSON.stringify(session));
    }

    function signOut() {
        localStorage.removeItem(sessionKey);
    }

    async function hashPassword(password) {
        var encoded = new TextEncoder().encode(password);
        var digest = await crypto.subtle.digest('SHA-256', encoded);
        var bytes = Array.from(new Uint8Array(digest));
        return bytes.map(function (byte) {
            return byte.toString(16).padStart(2, '0');
        }).join('');
    }

    async function signUp(details) {
        var users = getUsers();
        var email = String(details.email || '').trim().toLowerCase();
        var name = String(details.name || '').trim();
        var password = String(details.password || '');

        if (!name || !email || password.length < 8) {
            throw new Error('Use a name, a valid email, and a password with at least 8 characters.');
        }

        if (users.some(function (user) { return user.email === email; })) {
            throw new Error('An account with this email already exists.');
        }

        var user = {
            id: 'local-' + Date.now(),
            provider: 'local',
            name: name,
            email: email,
            passwordHash: await hashPassword(password)
        };

        users.push(user);
        saveUsers(users);
        saveSession({
            id: user.id,
            provider: user.provider,
            name: user.name,
            email: user.email
        });

        return getSession();
    }

    async function signIn(details) {
        var users = getUsers();
        var email = String(details.email || '').trim().toLowerCase();
        var passwordHash = await hashPassword(String(details.password || ''));
        var user = users.find(function (entry) {
            return entry.email === email && entry.passwordHash === passwordHash;
        });

        if (!user) {
            throw new Error('Invalid email or password.');
        }

        saveSession({
            id: user.id,
            provider: user.provider,
            name: user.name,
            email: user.email
        });

        return getSession();
    }

    function signInWithGoogleProfile(profile) {
        if (!profile || !profile.email) {
            throw new Error('Google profile data is missing.');
        }

        saveSession({
            id: profile.sub || 'google-' + Date.now(),
            provider: 'google',
            name: profile.name || profile.email,
            email: profile.email,
            avatar: profile.picture || ''
        });

        return getSession();
    }

    function decodeJwt(token) {
        var payload = token.split('.')[1];
        var normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        var decoded = atob(normalized);
        return JSON.parse(decoded);
    }

    window.PlaygroundAccount = {
        getUsers: getUsers,
        getSession: getSession,
        signOut: signOut,
        signUp: signUp,
        signIn: signIn,
        signInWithGoogleProfile: signInWithGoogleProfile,
        decodeJwt: decodeJwt
    };
})();
