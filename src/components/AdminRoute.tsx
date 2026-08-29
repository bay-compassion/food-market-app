import { AdminAuthView } from './AdminAuthView';
import { RequireAuth } from './RequireAuth';

/**
 * The `/admin` entry point, in its own module so the router can load the whole admin area — the
 * dashboard, every screen it can show, and the Auth0 redirect it needs — only when a worker
 * actually asks for it.
 */
export function AdminRoute() {
	return (
		<RequireAuth>
			<AdminAuthView />
		</RequireAuth>
	);
}
