import { createRouter } from '../../lib/http.mjs';
import { guestInformationRoutes } from './guest-information.mjs';
import { lotteryRegistrationRoutes } from './lottery-registration.mjs';
import { visitRoutes } from './visit.mjs';

export const guestApi = createRouter();

guestApi.route('/', guestInformationRoutes);
guestApi.route('/', lotteryRegistrationRoutes);
guestApi.route('/', visitRoutes);
