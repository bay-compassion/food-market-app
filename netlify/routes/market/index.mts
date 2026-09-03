import { createRouter } from '../../lib/http.mjs';
import { marketRoutes } from './market.mjs';

export const marketApi = createRouter();

marketApi.route('/', marketRoutes);
