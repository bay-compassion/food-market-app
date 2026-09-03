import { createRouter } from '../../lib/http.mjs';
import { broadcastRoutes } from './broadcast.mjs';
import { notificationStatusRoutes } from './notification-status.mjs';
import { pushSubscriptionRoutes } from './push-subscription.mjs';
import { smsSubscriptionRoutes } from './sms-subscription.mjs';

export const notificationApi = createRouter();

notificationApi.route('/', broadcastRoutes);
notificationApi.route('/', notificationStatusRoutes);
notificationApi.route('/', pushSubscriptionRoutes);
notificationApi.route('/', smsSubscriptionRoutes);
