import { useAuth0 } from '@auth0/auth0-react';
import { observer } from 'mobx-react-lite';
import { useNavigate, useParams } from 'react-router';

import { isAdminView, type AdminView } from './admin/types';
import { AdminAuthGate } from './AdminAuthGate';
import { AdminDashboard } from './AdminDashboard';

/** The `/admin` route's screen: the dashboard, once Auth0 has a signed-in worker. */
export const AdminAuthView = observer(function AdminAuthView() {
	const auth = useAuth0();
	const navigate = useNavigate();
	const params = useParams();
	const view: AdminView | undefined = isAdminView(params.view) ? params.view : undefined;
	// Only the session history opens something within it, so another screen ignores the segment.
	const sessionId = view === 'session-history' ? params.item : undefined;

	return (
		<AdminAuthGate>
			<AdminDashboard
				view={view}
				sessionId={sessionId}
				getAccessToken={auth.getAccessTokenSilently}
				onNavigate={(next, item) =>
					void navigate(item ? `/admin/${next}/${encodeURIComponent(item)}` : `/admin/${next}`)
				}
			/>
		</AdminAuthGate>
	);
});
