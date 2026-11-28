import { useAuth0 } from '@auth0/auth0-react';
import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useEffect, useState, type ReactNode } from 'react';

import { adminTranslations } from '../../adminLocales';
import { everyPermission, isAuth0Configured, permissionsFromToken } from '../../auth';
import { posterPermission } from '../../services/qr-posters';
import { useRootStore } from '../../stores/react/store-context';
import { AdminAuthGate } from '../AdminAuthGate';
import { RequireAuth } from '../RequireAuth';

const Message = styled.p`
	width: min(100% - 36px, 560px);
	margin: 0 auto;
	padding: 48px 0;
	color: var(--color-text-subtle);
	font-size: 17px;
	line-height: 1.6;
`;

/**
 * Reads the signed-in worker's permissions, as the dashboard does, and shows `children` only to
 * one who may print the market's posters.
 */
const PosterPermissionGate = observer(function PosterPermissionGate({
	children,
}: {
	children: ReactNode;
}) {
	const t = adminTranslations.en.qrPosters;
	const { getAccessTokenSilently } = useAuth0();
	const root = useRootStore();
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		let current = true;

		root.setAccessTokenProvider(getAccessTokenSilently);
		root.setPermissionReader(async () =>
			isAuth0Configured ? permissionsFromToken(await getAccessTokenSilently()) : everyPermission(),
		);
		void root.admin.loadPermissions().then(() => {
			if (current) {
				setLoaded(true);
			}
		});

		return () => {
			current = false;
		};
	}, [getAccessTokenSilently, root]);

	if (!loaded) {
		return <Message role="status">{t.loading}</Message>;
	}

	return root.admin.can(posterPermission) ? (
		children
	) : (
		<Message role="alert">{t.notPermitted}</Message>
	);
});

/**
 * In front of a printable QR code poster under `/admin`: sign in, then admins only. Its own module
 * so a poster route loads the Auth0 redirect only when a worker opens it.
 */
export function AdminPosterGate({ children }: { children: ReactNode }) {
	return (
		<RequireAuth>
			<AdminAuthGate>
				<PosterPermissionGate>{children}</PosterPermissionGate>
			</AdminAuthGate>
		</RequireAuth>
	);
}
