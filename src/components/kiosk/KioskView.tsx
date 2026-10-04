import { useAuth0 } from '@auth0/auth0-react';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';

import { isAuth0Configured } from '../../auth';
import { languages, translations, type Locale, type Translation } from '../../locales';
import { LanguageRotation } from '../../models/language-rotation';
import { KioskApi } from '../../services/kiosk-api';
import { QueueNumerals } from '../../services/queue-numerals';
import { KioskStore } from '../../stores/kiosk.store';
import { useRootStore } from '../../stores/react/store-context';
import { isLanguage } from '../../stores/translation.store';
import { useRotatingLocale } from '../hooks/use-rotating-locale';
import { useScreenWakeLock } from '../hooks/use-screen-wake-lock';
import { RequireAuth } from '../RequireAuth';
import { KioskBoard } from './KioskBoard';
import { KioskFrame, KioskMessage } from './KioskFrame';

const rotation = LanguageRotation.favoringFirst<Locale>(
	// English first: `favoringFirst` gives the first language the longer turn.
	['en', ...languages.map(({ code }) => code).filter((code) => code !== 'en')],
	{ firstMs: 20_000, restMs: 8_000 },
);

/**
 * The `/kiosk` route: a full-screen "now calling" display for a tablet or monitor in the room.
 *
 * It signs in like the admin area, and is meant to be signed in as an account holding
 * `view:kiosk` alone (see `docs/roles.md`), so the unattended machine carries nothing that can
 * change the queue. It renders outside the app shell — no bar, no menu, no footer — so there is
 * nothing on screen to tap through to.
 *
 * It cycles through every language — English for 20 seconds, then each of the others for 8 — so
 * a guest who reads any of them sees their own about once a minute. `?lang=es` pins one
 * language instead. Either way the choice is the display's alone: it never touches the language
 * saved for the app on this device. The layout stays left-to-right throughout; Arabic and Farsi
 * text still runs right-to-left within its own line (`dir="auto"`), but the screen does not flip
 * every few seconds.
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
	const locale = useRotatingLocale(
		useMemo(() => (isLanguage(lang) ? LanguageRotation.fixed(lang) : rotation), [lang]),
	);
	const translation: Translation = translations[locale];
	const t = translation.kiosk;
	const numerals = useMemo(() => new QueueNumerals(locale), [locale]);
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
		content = (
			<KioskBoard
				board={board}
				translation={translation}
				numerals={numerals}
				reconnecting={store.failure === 'connection'}
			/>
		);
	}

	return (
		<KioskFrame dir="ltr" lang={locale}>
			{content}
		</KioskFrame>
	);
});
