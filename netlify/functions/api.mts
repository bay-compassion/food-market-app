import type { Config } from '@netlify/functions';

import { routeHandler, createRouter } from '../lib/http.mjs';
import { demoRoutes } from '../routes/demo/demo-data.mjs';
import { guestApi } from '../routes/guests/index.mjs';
import { marketApi } from '../routes/market/index.mjs';
import { notificationApi } from '../routes/notifications/index.mjs';
import { reportRoutes } from '../routes/reports/reports.mjs';

export const api = createRouter();

api.route('/', marketApi);
api.route('/', guestApi);
api.route('/', notificationApi);
api.route('/', reportRoutes);
api.route('/', demoRoutes);

export default routeHandler(api);

export const config: Config = {
	path: [
		'/api/market',
		'/api/queue',
		'/api/guests',
		'/api/lottery-registration',
		'/api/guest-information',
		'/api/visit',
		'/api/push-subscription',
		'/api/sms-subscription',
		'/api/notification-status',
		'/api/broadcast',
		'/api/reports',
		'/api/demo-data',
	],
};
