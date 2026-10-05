import { useAuth0 } from '@auth0/auth0-react';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';

import { isAuth0Configured } from '../../auth';
import { languages, type Locale } from '../../locales';
import { LanguageRotation } from '../../models/language-rotation';
import { KioskApi } from '../../services/kiosk-api';
import { KioskStore } from '../../stores/kiosk.store';
import { useRootStore } from '../../stores/react/store-context';
import { isLanguage } from '../../stores/translation.store';
import { useRotationTurn } from '../hooks/use-rotation-turn';
import { useScreenWakeLock } from '../hooks/use-screen-wake-lock';
import { RequireAuth } from '../RequireAuth';
import { KioskLanguage, KioskLanguagesProvider, type KioskLanguages } from './kiosk-languages';
import { KioskBoard } from './KioskBoard';
import { KioskFrame, KioskMessage } from './KioskFrame';

const english = new KioskLanguage('en');

/** English is always on screen, so only the others take turns underneath it. */
const rotation = LanguageRotation.evenly<Locale>(
	languages.map(({ code }) => code).filter((code) => code !== 'en'),
	8_000,
);

/**
 * The `/kiosk` route: a full-screen "now calling" display for a tablet or monitor in the room.
 *
 * It signs in like the admin area, and is meant to be signed in as an account holding
 * `view:kiosk` alone (see `docs/roles.md`), so the unattended machine carries nothing that can
 * change the queue. It renders outside the app shell — no bar, no menu, no footer — so there is
 * nothing on screen to tap through to.
 *
 * Every line is in English, always, with a second language under it that rotates through the
 * rest, 8 seconds each — so a guest who reads any of them sees their own about every 48 seconds —
 * and a row of language names along the bottom shows which is up. `?lang=es` pins the second
 * language; `?lang=en` shows English alone. Either way the choice is the display's alone: it never
 * touches the language saved for the app on this device. The layout stays left-to-right
 * throughout; Arabic and Farsi lines still run right-to-left within themselves (`dir="auto"`), but
 * the screen does not flip every few seconds.
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
	const { isAuthenticated, isLoading, getAccessTokenSilently, loginWithRedirect } = useAuth0();
	const { pathname, search } = useLocation();
	const lang = useSearchParams()[0].get('lang');
	const activeRotation = useMemo(
		() => (isLanguage(lang) ? LanguageRotation.fixed<Locale>(lang) : rotation),
		[lang],
	);
	const { locale: secondaryLocale, durationMs, elapsedMs } = useRotationTurn(activeRotation);
	const rotating = activeRotation.locales.length > 1;
	const languagesShown = useMemo<KioskLanguages>(
		() => ({
			primary: english,
			secondary: secondaryLocale === 'en' ? null : new KioskLanguage(secondaryLocale),
			rotation: rotating ? activeRotation.locales : [],
			turn: rotating ? { durationMs, elapsedMs } : null,
		}),
		[activeRotation, rotating, secondaryLocale, durationMs, elapsedMs],
	);
	const [store] = useState(
		() =>
			new KioskStore({ api: new KioskApi({ requestHeaders: () => rootStore.requestHeaders() }) }),
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
		store.start();

		return () => store[Symbol.dispose]();
	}, [canRead, store]);

	const board = store.board;
	let content;

	if (store.failure === 'forbidden') {
		content = <KioskMessage message={(copy) => copy.notPermitted} />;
	} else if (store.failure === 'sign_in') {
		content = (
			<KioskMessage
				message={(copy) => copy.signInRequired}
				action={{
					label: (copy) => copy.signIn,
					onClick: () => void loginWithRedirect({ appState: { returnTo: `${pathname}${search}` } }),
				}}
			/>
		);
	} else if (isLoading || !canRead || store.isLoading) {
		content = <KioskMessage message={(copy) => copy.loading} />;
	} else if (!board) {
		content = <KioskMessage message={(copy) => copy.reconnecting} />;
	} else if (board.phase === 'not_started') {
		content = <KioskMessage message={(copy) => copy.notStarted} />;
	} else if (board.phase === 'ended') {
		content = <KioskMessage message={(copy) => copy.ended} />;
	} else {
		content = <KioskBoard board={board} reconnecting={store.failure === 'connection'} />;
	}

	return (
		<KioskLanguagesProvider value={languagesShown}>
			<KioskFrame dir="ltr" lang="en">
				{content}
			</KioskFrame>
		</KioskLanguagesProvider>
	);
});
