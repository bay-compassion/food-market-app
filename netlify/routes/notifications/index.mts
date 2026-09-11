import { createRouter } from '../../lib/http.mjs';
import { notificationStatusRoutes } from './notification-status.mjs';
import { pushSubscriptionRoutes } from './push-subscription.mjs';
import { smsSubscriptionRoutes } from './sms-subscription.mjs';
import { twilioIncomingMessageRoutes } from './twilio-incoming-message.mjs';

export const notificationApi = createRouter();

notificationApi.route('/', notificationStatusRoutes);
notificationApi.route('/', pushSubscriptionRoutes);
notificationApi.route('/', smsSubscriptionRoutes);
notificationApi.route('/', twilioIncomingMessageRoutes);
