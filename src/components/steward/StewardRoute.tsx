import { useAuth0 } from '@auth0/auth0-react';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router';

import { everyPermission, isAuth0Configured, permissionsFromToken } from '../../auth';
import { StewardApi } from '../../services/steward-api';
import { StewardStore } from '../../stores/steward.store';
import { AdminThemeProvider } from '../admin/AdminThemeProvider';
import { RequireAuth } from '../RequireAuth';
import { AutomaticView } from './AutomaticView';
import { ChangesView } from './ChangesView';
import { DrawView } from './DrawView';
import { GuestsView } from './GuestsView';
import { NoAccess } from './NoAccess';
import { PatternsView } from './PatternsView';
import { StewardProvider, useSteward } from './steward-context';
import { Lede } from './steward.styles';
import { StewardShell, stewardViews, type StewardView } from './StewardShell';

const views: Record<StewardView, () => React.JSX.Element> = {
	draw: DrawView,
	guests: GuestsView,
	patterns: PatternsView,
	changes: ChangesView,
	automatic: AutomaticView,
};

/**
 * The `/steward` entry point: draw odds, guest history, and changing odds, for named stewards.
 *
 * Its own lazily loaded route and API, away from the admin dashboard, so none of this reaches a
 * worker's or a guest's download by accident. The server decides who sees anything; this only
 * spares someone without the role a screen that would stay empty. See `docs/roles.md`.
 */
export function StewardRoute() {
	return (
		<RequireAuth>
			<StewardAuthGate />
		</RequireAuth>
	);
}

function StewardAuthGate() {
	const auth = useAuth0();

	if (isAuth0Configured && (auth.isLoading || !auth.isAuthenticated)) {
		return null;
	}

	return <StewardArea getAccessToken={auth.getAccessTokenSilently} />;
}

function StewardArea({ getAccessToken }: { getAccessToken: () => Promise<string> }) {
	const [store] = useState(
		() =>
			new StewardStore({
				api: new StewardApi(getAccessToken),
				readPermissions: async () =>
					isAuth0Configured ? permissionsFromToken(await getAccessToken()) : everyPermission(),
			}),
	);

	useEffect(() => {
		void store.load();
	}, [store]);

	return (
		<AdminThemeProvider>
			<StewardProvider store={store}>
				<StewardScreensAtRoute />
			</StewardProvider>
		</AdminThemeProvider>
	);
}

function StewardScreensAtRoute() {
	const { view } = useParams();

	return <StewardScreens view={view} />;
}

export const StewardScreens = observer(function StewardScreens({ view }: { view?: string }) {
	const steward = useSteward();
	const known = stewardViews.find(([name]) => name === view)?.[0];

	if (!steward.permissions) {
		return null;
	}

	if (!steward.canRead) {
		return <NoAccess />;
	}

	if (!known) {
		return <Navigate to="/steward/draw" replace />;
	}

	const Screen = views[known];

	return (
		<StewardShell>
			{steward.loadError ? <Lede role="alert">{steward.loadError}</Lede> : null}
			{steward.roster ? <Screen /> : null}
		</StewardShell>
	);
});
