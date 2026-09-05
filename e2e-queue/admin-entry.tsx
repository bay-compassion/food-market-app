import { useNavigate, useParams } from 'react-router';

import { isAdminView } from '../src/components/admin/types';
import { AdminDashboard } from '../src/components/AdminDashboard';

/** Only the rig's Vite config substitutes this for the Auth0 account/sign-in wrapper. */
export function AdminAuthView() {
	const navigate = useNavigate();
	const { view } = useParams();

	return (
		<AdminDashboard
			view={isAdminView(view) ? view : 'current-session'}
			getAccessToken={async () => ''}
			onNavigate={(next) => void navigate(`/admin/${next}`)}
		/>
	);
}
