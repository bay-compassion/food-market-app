import { drizzle } from 'drizzle-orm/netlify-db';

import * as schema from './schema.mjs';

export const db = drizzle({ schema });
