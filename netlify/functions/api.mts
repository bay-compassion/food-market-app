import type { Config } from '@netlify/functions';

import { routeHandler, createRouter } from '../lib/http.mjs';
import { adminApi } from '../routes/admin/index.mjs';
import { guestApi } from '../routes/guests/index.mjs';
import { marketApi } from '../routes/market/index.mjs';
import { notificationApi } from '../routes/notifications/index.mjs';

export const api = createRouter();

api.route('/', marketApi);
api.route('/', guestApi);
api.route('/', notificationApi);
api.route('/api/admin', adminApi);

export default routeHandler(api);

export const config: Config = {
	path: [
		'/api/admin',
		'/api/admin/*',
		'/api/market',
		'/api/lottery-registration',
		'/api/guest-information',
		'/api/visit',
		'/api/push-subscription',
		'/api/sms-subscription',
		'/api/notification-status',
	],
};
