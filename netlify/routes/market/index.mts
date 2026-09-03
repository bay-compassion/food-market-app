import { createRouter } from '../../lib/http.mjs';
import { marketRoutes } from './market.mjs';
import { queueRoutes } from './queue.mjs';

export const marketApi = createRouter();

marketApi.route('/', marketRoutes);
marketApi.route('/', queueRoutes);
