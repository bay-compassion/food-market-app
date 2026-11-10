// Points node-config at the app's own `config/` and picks its environment. node-config reads both
// when it loads, so this module has to be evaluated before it; `settings.ts` imports it first.
//
// A packaged app runs from `/` with no NODE_ENV, and node-config's default environment is
// `development`, which would point the iMac at a laptop's local server. So a packaged app defaults
// to `production`. Either can still be set from outside: `NODE_CONFIG_ENV=production pnpm dev`.

import path from 'node:path';

import { app } from 'electron';

process.env.NODE_CONFIG_DIR = path.join(app.getAppPath(), 'config');
process.env.NODE_CONFIG_ENV ??= app.isPackaged ? 'production' : 'development';
