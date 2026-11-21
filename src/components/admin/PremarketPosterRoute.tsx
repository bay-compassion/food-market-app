import { AdminAuthGate } from '../AdminAuthGate';
import { RequireAuth } from '../RequireAuth';
import { PremarketPoster } from './PremarketPoster';

/**
 * The `premarketPosterPath` route, in its own module so the router loads it — and the Auth0
 * redirect in front of it — only when a worker opens it. Signed in is enough: the dashboard
 * hands the same code to anyone it shows the Today screen.
 */
export function PremarketPosterRoute() {
	return (
		<RequireAuth>
			<AdminAuthGate>
				<PremarketPoster />
			</AdminAuthGate>
		</RequireAuth>
	);
}
