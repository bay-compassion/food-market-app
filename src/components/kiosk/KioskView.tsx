import { useAuth0 } from '@auth0/auth0-react';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';

import { isAuth0Configured } from '../../auth';
import { KioskApi } from '../../services/kiosk-api';
import { KioskStore } from '../../stores/kiosk.store';
import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import { isLanguage } from '../../stores/translation.store';
import { useScreenWakeLock } from '../hooks/use-screen-wake-lock';
import { RequireAuth } from '../RequireAuth';
import { KioskBoard } from './KioskBoard';
import { KioskFrame, KioskMessage } from './KioskFrame';

/**
 * The `/kiosk` route: a full-screen "now calling" display for a tablet or monitor in the room.
 *
 * It signs in like the admin area, and is meant to be signed in as an account holding
 * `view:kiosk` alone (see `docs/roles.md`), so the unattended machine carries nothing that can
 * change the queue. It renders outside the app shell — no bar, no menu, no footer — so there is
 * nothing on screen to tap through to. `?lang=es` picks the display's language once; it is saved
 * like any other choice of language, so the device keeps it.
 */
export function KioskView() {
	return (
		<RequireAuth>
			<KioskScreen />
		</RequireAuth>
	);
}

const KioskScreen = observer(function KioskScreen() {
	const rootStore = useRootStore();
	const { translations } = rootStore;
	const t = useTranslation().kiosk;
	const { isAuthenticated, isLoading, getAccessTokenSilently, loginWithRedirect } = useAuth0();
	const { pathname, search } = useLocation();
	const lang = useSearchParams()[0].get('lang');
	const [store] = useState(
		() =>
			new KioskStore({ api: new KioskApi({ requestHeaders: () => rootStore.requestHeaders() }) }),
	);
	const canRead = !isAuth0Configured || isAuthenticated;

	useScreenWakeLock();

	useEffect(() => {
		if (isLanguage(lang)) {
			translations.setLanguage(lang);
		}
	}, [lang, translations]);

	useEffect(() => {
		if (isAuth0Configured) {
			rootStore.setAccessTokenProvider(getAccessTokenSilently);
		}
	}, [getAccessTokenSilently, rootStore]);

	useEffect(() => {
		if (!canRead) {
			return;
		}
		store.start();

		return () => store[Symbol.dispose]();
	}, [canRead, store]);

	const board = store.board;
	let content;

	if (store.failure === 'forbidden') {
		content = <KioskMessage message={t.notPermitted} />;
	} else if (store.failure === 'sign_in') {
		content = (
			<KioskMessage
				message={t.signInRequired}
				action={{
					label: t.signIn,
					onClick: () => void loginWithRedirect({ appState: { returnTo: `${pathname}${search}` } }),
				}}
			/>
		);
	} else if (isLoading || !canRead || store.isLoading) {
		content = <KioskMessage message={t.loading} />;
	} else if (!board) {
		content = <KioskMessage message={t.reconnecting} />;
	} else if (board.phase === 'not_started') {
		content = <KioskMessage message={t.notStarted} />;
	} else if (board.phase === 'ended') {
		content = <KioskMessage message={t.ended} />;
	} else {
		content = <KioskBoard board={board} reconnecting={store.failure === 'connection'} />;
	}

	return (
		<KioskFrame dir={translations.dir} lang={translations.locale}>
			{content}
		</KioskFrame>
	);
});
