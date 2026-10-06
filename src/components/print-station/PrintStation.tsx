import { useAuth0 } from '@auth0/auth0-react';
import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';

import { adminTranslations } from '../../adminLocales';
import { isAuth0Configured } from '../../auth';
import { PrintStationApi } from '../../services/print-station-api';
import { PrintStationStore } from '../../stores/print-station.store';
import { useRootStore } from '../../stores/react/store-context';
import { useScreenWakeLock } from '../hooks/use-screen-wake-lock';
import { RequireAuth } from '../RequireAuth';
import { PrintStationProvider } from './print-station-context';
import { PrintStationLog } from './PrintStationLog';
import { PrintStationSetup } from './PrintStationSetup';
import { StationPrinter } from './StationPrinter';

const Frame = styled.main`
	box-sizing: border-box;
	display: grid;
	gap: 24px;
	align-content: start;
	width: min(100%, 720px);
	min-height: 100dvh;
	margin-inline: auto;
	padding: 32px 20px;
	color: var(--color-text);
	background: var(--color-background);
	font-family: var(--font-body);

	h1 {
		margin: 0;
		font-family: var(--font-heading);
		font-size: 28px;
	}

	.status {
		margin: 6px 0 0;
		font-size: 18px;
		font-weight: 700;
	}

	.status[data-state='ready'] {
		color: var(--color-success);
	}

	.status[data-state='problem'] {
		color: var(--color-error);
	}

	.detail {
		margin: 4px 0 0;
		color: var(--color-text-subtle);
	}
`;

const timeFormat = new Intl.DateTimeFormat('en-US', {
	hour: 'numeric',
	minute: '2-digit',
	second: '2-digit',
});

/**
 * The `/printing-station` route: a desktop at the market that prints the name tags volunteers send
 * from their phones, with no print dialog when its browser was started for it.
 *
 * It signs in like the admin area, and is meant to be signed in as an account holding
 * `print:name-tags` alone (see `docs/roles.md`), so the unattended machine can print tags but not
 * change the queue. Outside the app shell, like `/kiosk`.
 */
export function PrintStationRoute() {
	return (
		<RequireAuth>
			<PrintStation />
		</RequireAuth>
	);
}

const PrintStation = observer(function PrintStation() {
	const t = adminTranslations.en.queueDesk.printStation;
	const rootStore = useRootStore();
	const { isAuthenticated, isLoading, getAccessTokenSilently, loginWithRedirect } = useAuth0();
	const { pathname, search } = useLocation();
	const [station] = useState(
		() =>
			new PrintStationStore({
				api: new PrintStationApi({ requestHeaders: () => rootStore.requestHeaders() }),
			}),
	);
	const canRead = !isAuth0Configured || isAuthenticated;

	useScreenWakeLock();

	useEffect(() => {
		if (isAuth0Configured) {
			rootStore.setAccessTokenProvider(getAccessTokenSilently);
		}
	}, [getAccessTokenSilently, rootStore]);

	useEffect(() => {
		if (!canRead) {
			return;
		}

		station.start();

		return () => station[Symbol.dispose]();
	}, [canRead, station]);

	let status: { text: string; state: 'ready' | 'waiting' | 'problem' };

	if (station.failure === 'forbidden') {
		status = { text: t.notPermitted, state: 'problem' };
	} else if (station.failure === 'sign_in') {
		status = { text: t.signInRequired, state: 'problem' };
	} else if (station.failure === 'connection') {
		status = { text: t.reconnecting, state: 'problem' };
	} else if (isLoading || !canRead || station.isLoading) {
		status = { text: t.loading, state: 'waiting' };
	} else {
		status = { text: t.ready, state: 'ready' };
	}

	return (
		<PrintStationProvider value={station}>
			<Frame dir="ltr" lang="en">
				<header>
					<h1>{t.title}</h1>
					<p className="status" data-state={status.state} role="status">
						{status.text}
					</p>
					{station.checkedAt === null ? null : (
						<p className="detail">
							{t.checkedAt.replace('{time}', timeFormat.format(station.checkedAt))}
						</p>
					)}
					<p className="detail">{t.keepOpen}</p>
				</header>
				{station.failure === 'sign_in' ? (
					<Button
						variant="contained"
						onClick={() =>
							void loginWithRedirect({ appState: { returnTo: `${pathname}${search}` } })
						}
					>
						{t.signIn}
					</Button>
				) : null}
				<PrintStationLog />
				<PrintStationSetup />
			</Frame>
			<StationPrinter />
		</PrintStationProvider>
	);
});
