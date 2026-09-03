import { withAuth0, type AdminEnv } from '../../lib/http-auth.mjs';
import { createRouter } from '../../lib/http.mjs';
import { broadcastRoutes } from './broadcast.mjs';
import { demoRoutes } from './demo-data.mjs';
import { guestRoutes } from './guests.mjs';
import { adminMarketRoutes } from './market.mjs';
import { queueRoutes } from './queue.mjs';
import { reportRoutes } from './reports.mjs';

export const adminApi = createRouter<AdminEnv>();

// Keep this gate before every route so new admin endpoints are protected by default.
adminApi.use('*', withAuth0);
adminApi.route('/', adminMarketRoutes);
adminApi.route('/', guestRoutes);
adminApi.route('/', queueRoutes);
adminApi.route('/', broadcastRoutes);
adminApi.route('/', reportRoutes);
adminApi.route('/', demoRoutes);
