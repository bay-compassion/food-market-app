import { AdminPosterGate } from './AdminPosterGate';
import { PremarketPoster } from './PremarketPoster';

/**
 * The `premarketPosterPath` route, in its own module so the router loads it — and the Auth0
 * redirect in front of it — only when a worker opens it. Admins only, like the standby poster.
 */
export function PremarketPosterRoute() {
	return (
		<AdminPosterGate>
			<PremarketPoster />
		</AdminPosterGate>
	);
}
