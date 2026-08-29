import { useAuth0 } from '@auth0/auth0-react';
import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useNavigate, useParams } from 'react-router';

import { authReturnUrl, isAuth0Configured } from '../auth';
import { useTranslation } from '../stores/react/use-translation';
import { isAdminView, type AdminView } from './admin/types';
import { AdminDashboard } from './AdminDashboard';

const AuthMessage = styled.section`
	width: min(100% - 36px, 560px);
	margin: 0 auto;
	padding: 48px 0;

	h1 {
		color: var(--color-brand);
	}

	p {
		color: var(--color-text-subtle);
		font-size: 17px;
		line-height: 1.6;
	}
`;

const Account = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 12px;
	width: min(100% - 32px, 1180px);
	margin: 20px auto 0;
	font-size: 13px;
	color: var(--color-text-subtle);

	span {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	button {
		flex: 0 0 auto;
		padding: 9px 13px;
		border: 1.5px solid var(--color-brand);
		border-radius: var(--radius-pill);
		color: var(--color-brand);
		background: transparent;
		font-weight: 700;
	}
`;

/**
 * The `/admin` route's gate: Auth0's state decides whether the dashboard renders at all.
 *
 * `useAuth0` is safe to call unconditionally — with no Auth0 configured the provider supplies a
 * default context, and the branch above never reaches the dashboard anyway.
 */
export const AdminAuthView = observer(function AdminAuthView() {
	const t = useTranslation();
	const auth = useAuth0();
	const navigate = useNavigate();
	const params = useParams();
	const view: AdminView = isAdminView(params.view) ? params.view : 'current-session';

	function signOut() {
		void auth.logout({ logoutParams: { returnTo: authReturnUrl } });
	}

	if (!isAuth0Configured) {
		return (
			<AuthMessage className="auth-message" role="alert">
				<h1>{t.authConfigurationRequired}</h1>
				<p>{t.authConfigurationDescription}</p>
			</AuthMessage>
		);
	}

	if (auth.isLoading) {
		return (
			<AuthMessage className="auth-message" aria-live="polite">
				<p>{t.authLoading}</p>
			</AuthMessage>
		);
	}

	if (!auth.isAuthenticated) {
		return (
			<AuthMessage className="auth-message" role="alert">
				<p>{t.authError}</p>
			</AuthMessage>
		);
	}

	return (
		<>
			<Account className="admin-account">
				<span>
					{t.signedInAs} {auth.user?.email ?? auth.user?.name}
				</span>
				<button type="button" onClick={signOut}>
					{t.signOut}
				</button>
			</Account>
			<AdminDashboard
				view={view}
				getAccessToken={auth.getAccessTokenSilently}
				onNavigate={(next) => void navigate(`/admin/${next}`)}
			/>
		</>
	);
});
