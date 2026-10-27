# 👻 GHOST MESSAGE

Anonymous messages from the unknown — a mobile-first React + Vite prototype with Cloudflare Pages Functions API.

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

## Cloudflare Pages build settings

- Framework preset: **Vite**
- Build command: `npm run build`
- Build output directory: `dist`

## Connect D1

1. Open the `ghost-message-db` database in Cloudflare D1.
2. Open its SQL Console and run the complete contents of `schema.sql`.
3. In Pages project settings, open **Settings → Functions → D1 database bindings**.
4. Add binding name `DB` and select `ghost-message-db`.
5. Save and trigger a new deployment.

The `wrangler.toml` also documents the D1 binding for Wrangler-based workflows.

## API routes

- `POST /api/session` — create an anonymous session
- `GET /api/me` — current anonymous profile
- `GET /api/messages` — received messages
- `GET /api/messages?kind=sent` — sent messages
- `POST /api/messages` — send a public or random message, or reply with `parentId`
- `GET /api/feed` — public feed
- `POST /api/messages/:id/reactions` — add a reaction
- `POST /api/messages/:id/report` — report a message
- `POST /api/blocks` — block a user

## Current scope and limitations

The frontend is a prototype and has not yet been connected to these API routes. Scheduled messages are stored with a future delivery time, but a scheduled trigger/queue must be added to deliver them at the right time and send push notifications. Random recipient matching needs another registered user. Add moderation review, abuse monitoring, privacy review, and automated tests before public launch. Anonymous sessions use bearer tokens: keep them private and do not log them.