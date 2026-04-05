# Environment Setup

The repository now includes a root [.env](file:///Users/viki/playground/.env) file with placeholders for payment and Google sign-in.

Important: this project is static. The browser cannot safely read server secrets from `.env` directly.

Use the values this way:

- public values must also be copied into [playground-config.js](file:///Users/viki/playground/playground-config.js)
- secret values stay on your future server, webhook, or automation layer

## What Each Value Is For

`PUBLIC_SITE_URL`
- Your final public URL, for example `https://playground.example.com`

`PUBLIC_SUPPORT_EMAIL`
- Support and sales mailbox shown in the UI

`PUBLIC_PLAYGROUND_TICKET_NAME`
- Display name for the subscription or ticket

`PUBLIC_PLAYGROUND_TICKET_PRICE_EUR`
- Public product price shown in the UI

`PUBLIC_STRIPE_CHECKOUT_URL`
- Your Stripe Payment Link or Checkout URL

`PUBLIC_STRIPE_SUCCESS_URL`
- Where Stripe should redirect after successful payment

`PUBLIC_STRIPE_CANCEL_URL`
- Where Stripe should redirect after cancelled checkout

`STRIPE_SECRET_KEY`
- Secret Stripe server key for webhook validation or future backend billing logic

`STRIPE_WEBHOOK_SECRET`
- Stripe webhook signing secret for payment confirmation events

`PUBLIC_GOOGLE_CLIENT_ID`
- Google OAuth client ID used by the browser sign-in button

`GOOGLE_CLIENT_SECRET`
- OAuth client secret for your future backend or auth callback exchange

## How To Get Google Sign-In Values

1. Open Google Cloud Console.
2. Create or select a project.
3. Go to `APIs & Services` -> `Credentials`.
4. Configure the OAuth consent screen.
5. Create an `OAuth 2.0 Client ID` for a Web application.
6. Add your final domain to `Authorized JavaScript origins`.
7. Add your production callback URL if you later add a backend.
8. Copy the client ID into `PUBLIC_GOOGLE_CLIENT_ID` and [playground-config.js](file:///Users/viki/playground/playground-config.js).
9. Keep the client secret out of the browser and store it only in `.env` on your secure backend.

## How To Get Stripe Values

1. Create or open your Stripe account.
2. Create a recurring product and price for the Playground Ticket.
3. Generate a Payment Link or Checkout flow.
4. Paste that public URL into `PUBLIC_STRIPE_CHECKOUT_URL` and [playground-config.js](file:///Users/viki/playground/playground-config.js).
5. Copy your live secret key into `STRIPE_SECRET_KEY` for backend use.
6. Create a webhook endpoint in Stripe and copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

## Static-Site Reality Check

This repository now provides:

- a complete UI for account, ticket, preview, and legal pages
- a client-side Google sign-in hook
- a ticket gate for the catalog

For real production enforcement you still need a backend or signed entitlement layer to:

- confirm paid subscriptions per user
- connect Stripe payments to account access
- securely store server secrets
- validate Google tokens server-side if you want stronger security
