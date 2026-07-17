# The Bay Compassion

The Bay Compassion is a mobile-first check-in app for a community food market. Guests can choose their language, share the details needed for their visit, and join the queue. The app currently supports English, Spanish, Farsi, Tagalog, Vietnamese, Chinese, and Arabic. An early admin view is also available for future queue-management tools.

The frontend is a Vue 3 app in `src/`. Guest submissions are handled by a Netlify Function and stored with Netlify DB through Drizzle.

## Quickstart

### Prerequisites

- Node.js 24.15.0 (see `.nvmrc`)
- The [Netlify CLI](https://docs.netlify.com/cli/get-started/), signed in and linked to the Netlify site when you need to use functions or the database

### Run locally

```bash
npm install
npm start
```

`npm start` runs `netlify dev`, which serves the Vue app and Netlify Functions together. Follow the command output to open the local URL.

To work only on the frontend, you can also run:

```bash
npm run dev
```

This Vite server does not run the `/api/guests` Netlify Function.

## Checks

Run these commands from the repository root before opening a pull request:

```bash
npm run lint
npm run format:check
npm run test:unit -- --run
npm run build
```

## Deployment

The app is configured for Netlify in `netlify.toml`. Connect the repository to a Netlify site; Netlify builds the root app and publishes `dist`, while serving the functions in `netlify/functions/`.

## Project structure

- `src/` — Vue 3 frontend
- `public/` — static frontend assets
- `netlify/functions/` — API endpoints, including guest check-in
- `netlify/database/migrations/` — Netlify DB migrations
- `db/` — Drizzle schema and database client
