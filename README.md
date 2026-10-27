# 👻 GHOST MESSAGE

Anonymous messages from the unknown — a mobile-first React + Vite prototype.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Current prototype features

- Dark neon responsive interface for mobile and desktop
- Anonymous-message composer with random-recipient and public-feed modes
- Delivery-time UI (now, in an hour, at midnight)
- Demo inbox, public feed, reactions, reply-chain interaction, notifications and profile
- Local in-memory demo state; refreshing the page resets it

## Cloudflare Pages

Use the following build settings:
- Framework preset: **Vite**
- Build command: `npm run build`
- Build output directory: `dist`

## Before launch

This is a frontend prototype. Scheduled delivery, actual random recipient matching, persistent accounts/messages, real push notifications, moderation/reporting, and privacy controls require a backend. Next step: connect Cloudflare Workers + D1 and implement server-side validation, rate limits, block/report flows, and scheduled delivery. Never promise anonymity until the server and logging design have been reviewed.