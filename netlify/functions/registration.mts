import type { Config } from '@netlify/functions';

import { createRouter, routeHandler } from '../lib/http.mjs';
import { guestClaimRoutes } from '../routes/guests/guest-claim.mjs';
import { guestInformationRoutes } from '../routes/guests/guest-information.mjs';
import { lotteryRegistrationRoutes } from '../routes/guests/lottery-registration.mjs';
import { premarketRegistrationRoutes } from '../routes/guests/premarket-registration.mjs';
import { standbyRegistrationRoutes } from '../routes/guests/standby-registration.mjs';

const registration = createRouter();

registration.route('/', guestInformationRoutes);
registration.route('/', lotteryRegistrationRoutes);
registration.route('/', guestClaimRoutes);
registration.route('/', premarketRegistrationRoutes);
registration.route('/', standbyRegistrationRoutes);

export default routeHandler(registration, 'registration');

// Isolate public writes so guests sharing Wi-Fi cannot exhaust this budget by polling their visit.
export const config: Config = {
	path: [
		'/api/guest-information',
		'/api/lottery-registration',
		'/api/guest-claim',
		'/api/premarket-status',
		'/api/premarket-registration',
		'/api/standby-ticket',
		'/api/standby-registration',
	],
	rateLimit: {
		windowLimit: 300,
		windowSize: 60,
		aggregateBy: ['ip', 'domain'],
	},
};
