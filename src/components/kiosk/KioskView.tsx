import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { languages, type Locale } from '../../locales';
import { LanguageRotation } from '../../models/language-rotation';
import { KioskApi } from '../../services/kiosk-api';
import { KioskStore } from '../../stores/kiosk.store';
import { isLanguage } from '../../stores/translation.store';
import { useRotationTurn } from '../hooks/use-rotation-turn';
import { useScreenWakeLock } from '../hooks/use-screen-wake-lock';
import { KioskLanguage, KioskLanguagesProvider, type KioskLanguages } from './kiosk-languages';
import { KioskBoard } from './KioskBoard';
import { KioskFrame, KioskMessage } from './KioskFrame';
import { KioskFullscreenButton } from './KioskFullscreenButton';
import { KioskLockedScreen } from './KioskLockedScreen';

const english = new KioskLanguage('en');

/** English is always on screen, so only the others take turns underneath it. */
const rotation = LanguageRotation.evenly<Locale>(
	languages.map(({ code }) => code).filter((code) => code !== 'en'),
	8_000,
);

/**
 * The `/kiosk` route: a full-screen "now calling" display for a tablet or monitor in the room.
 *
 * It never signs in. A worker unlocks it once with a six-digit code from their phone, which the
 * display trades for a kiosk token it keeps (see `docs/roles.md`), so no worker's account is ever
 * left open on an unattended screen in a public room. Until then it shows a locked screen, in
 * English alone. It renders outside the app shell — no bar, no
 * menu, no footer — so there is nothing on screen to tap through to.
 *
 * Every line is in English, always, with a second language under it that rotates through the
 * rest, 8 seconds each — so a guest who reads any of them sees their own about every 48 seconds —
 * and a row of language names along the bottom shows which is up. `?lang=es` pins the second
 * language; `?lang=en` shows English alone. Either way the choice is the display's alone: it never
 * touches the language saved for the app on this device. The layout stays left-to-right
 * throughout; Arabic and Farsi lines still run right-to-left within themselves (`dir="auto"`), but
 * the screen does not flip every few seconds.
 */
export const KioskView = observer(function KioskView() {
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
	const [store] = useState(() => new KioskStore({ api: new KioskApi() }));

	useScreenWakeLock();

	useEffect(() => {
		store.start();

		return () => store[Symbol.dispose]();
	}, [store]);

	if (store.isLocked) {
		// A gate in front of the board, in English alone: no rotating language to provide.
		return (
			<KioskFrame dir="ltr" lang="en">
				<KioskLockedScreen store={store} />
				<KioskFullscreenButton />
			</KioskFrame>
		);
	}

	const board = store.board;
	let content;

	if (store.isLoading) {
		content = <KioskMessage message={(copy) => copy.loading} />;
	} else if (!board) {
		content = <KioskMessage message={(copy) => copy.reconnecting} />;
	} else if (board.phase === 'not_started') {
		content = <KioskMessage message={(copy) => copy.notStarted} />;
	} else if (board.phase === 'ended') {
		content = <KioskMessage message={(copy) => copy.ended} />;
	} else {
		content = <KioskBoard board={board} reconnecting={store.isReconnecting} />;
	}

	return (
		<KioskLanguagesProvider value={languagesShown}>
			<KioskFrame dir="ltr" lang="en">
				{content}
				<KioskFullscreenButton />
			</KioskFrame>
		</KioskLanguagesProvider>
	);
});
