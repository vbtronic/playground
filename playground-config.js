window.PLAYGROUND_CONFIG = {
    brand: {
        name: 'Playground',
        author: 'Viktor Brunclik',
        builtWith: 'Claude Code and Amp'
    },
    contact: {
        email: 'vb@vbtronic.com'
    },
    license: {
        storageKey: 'playgroundGamesLicense',
        statusValue: 'active',
        planName: 'Studio Games Pass',
        monthlyPriceEur: 14.9,
        allowLocalPreview: true
    },
    payment: {
        provider: 'stripe-payment-link-ready',
        checkoutUrl: 'mailto:vb@vbtronic.com?subject=Playground%20Games%20License%20%E2%80%94%20%E2%82%AC14.90%2Fmonth',
        successPath: 'payment-success.html',
        cancelPath: 'payment-cancelled.html'
    },
    deployment: {
        customDomainReady: true,
        serverReady: true,
        privateRepoReady: true,
        paymentGatewayReady: true
    }
};
