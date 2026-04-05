window.PLAYGROUND_CONFIG = {
    brand: {
        name: 'Playground',
        author: 'Viktor Brunclik',
        builtWith: 'Claude Code and Amp'
    },
    contact: {
        email: 'vb@vbtronic.com'
    },
    routes: {
        home: 'index.html',
        applications: 'applications/',
        contact: 'contact/',
        buyTicket: 'buy-ticket/',
        account: 'account/',
        privacyPolicy: 'privacy-policy/',
        cookiePolicy: 'cookie-policy/',
        termsOfService: 'terms-of-service/'
    },
    license: {
        storageKey: 'playgroundTicketStatus',
        statusValue: 'active',
        planName: 'Playground Ticket',
        monthlyPriceEur: 7.9,
        allowLocalPreview: true
    },
    payment: {
        provider: 'stripe-payment-link-ready',
        checkoutUrl: 'mailto:vb@vbtronic.com?subject=Playground%20Ticket%20%E2%80%94%20%E2%82%AC7.90%2Fmonth',
        successPath: 'buy-ticket/?ticket=active',
        cancelPath: 'buy-ticket/?payment=cancelled'
    },
    auth: {
        googleClientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
        sessionStorageKey: 'playgroundAccountSession',
        usersStorageKey: 'playgroundLocalAccounts'
    },
    deployment: {
        customDomainReady: true,
        serverReady: true,
        privateRepoReady: true,
        paymentGatewayReady: true,
        authReadyForClientPrototype: true
    },
    products: [
        {
            id: 'political-calculator',
            name: 'Political Calculator',
            kind: 'Application',
            path: 'political-calculator/',
            previewPath: 'preview/political-calculator/',
            summary: 'A guided political matching tool with a structured questionnaire and instant ranking output.'
        },
        {
            id: 'racing',
            name: 'Racing',
            kind: 'Game',
            path: 'racing/',
            previewPath: 'preview/racing/',
            summary: 'Top-down 3D circuit racing with harder AI rivals and a shared Playground shell.'
        },
        {
            id: 'space-invaders',
            name: 'Space Invaders',
            kind: 'Game',
            path: 'games/space-invaders-playground/',
            previewPath: 'preview/space-invaders/',
            summary: 'A faster arcade defense loop with enemy fire, multiple waves, and stronger pacing.'
        },
        {
            id: 'space-mission',
            name: 'Space Mission',
            kind: 'Game',
            path: 'games/vesmirna-mise-playground/',
            previewPath: 'preview/space-mission/',
            summary: 'A repaired survival mission with shield timing, escalating pressure, and English UI.'
        },
        {
            id: 'city-forge',
            name: 'City Forge',
            kind: 'Game',
            path: 'games/city-forge-playground/',
            previewPath: 'preview/city-forge/',
            summary: 'A compact city-builder run with milestones, pressure systems, and clearer objectives.'
        }
    ]
};
