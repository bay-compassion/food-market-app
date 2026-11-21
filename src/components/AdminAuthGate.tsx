import { useAuth0 } from '@auth0/auth0-react';
import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import type { ReactNode } from 'react';

import { isAuth0Configured } from '../auth';
import { useTranslation } from '../stores/react/use-translation';

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

/**
 * The gate in front of every signed-in screen: Auth0's state decides whether `children` render at
 * all. Pair it with `RequireAuth`, which sends a signed-out visitor to sign in.
 *
 * `useAuth0` is safe to call unconditionally — with no Auth0 configured the provider supplies a
 * default context, and the first branch never reaches `children` anyway.
 */
export const AdminAuthGate = observer(function AdminAuthGate({
	children,
}: {
	children: ReactNode;
}) {
	const t = useTranslation();
	const auth = useAuth0();

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

	return children;
});
