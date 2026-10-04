import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import { createContext, useContext } from 'react';

import { translations, type KioskTranslations, type Locale } from '../../locales';
import { QueueNumerals } from '../../services/queue-numerals';

/** One language as the room display uses it: its copy, and how it writes numbers. */
export class KioskLanguage {
	readonly copy: KioskTranslations;
	readonly numerals: QueueNumerals;
	/** A proper name, the same in every language — but read from the dictionary, not restated. */
	readonly marketName: string;

	constructor(readonly locale: Locale) {
		this.copy = translations[locale].kiosk;
		this.marketName = translations[locale].marketName;
		this.numerals = new QueueNumerals(locale);
	}
}

export type KioskLanguages = {
	/** Always on screen. */
	primary: KioskLanguage;
	/** Shown under the primary, rotating; `null` when the display is pinned to English alone. */
	secondary: KioskLanguage | null;
	/** Every secondary language in turn order, for the indicator. Empty when one is pinned. */
	rotation: readonly Locale[];
};

const KioskLanguagesContext = createContext<KioskLanguages>({
	primary: new KioskLanguage('en'),
	secondary: null,
	rotation: [],
});

/**
 * Screen-local, not app state: the display's languages rotate on their own clock and never touch
 * the language a guest picked on this device, so they live with `/kiosk` rather than in the store.
 */
export const KioskLanguagesProvider = KioskLanguagesContext.Provider;

export function useKioskLanguages(): KioskLanguages {
	return useContext(KioskLanguagesContext);
}

/** Writes one piece of copy for a language. Numbers go through `numerals`, so each reads natively. */
export type KioskText = (copy: KioskTranslations, numerals: QueueNumerals) => string;

const fadeIn = keyframes`
	from { opacity: 0; }
`;

const Primary = styled.span`
	display: block;
`;

const Secondary = styled.span`
	display: block;
	margin-top: 0.15em;
	font-size: 0.62em;
	font-weight: 500;
	opacity: 0.85;
	/* Spacing letters apart breaks Arabic and Farsi's joined script, and capitals are the primary's. */
	letter-spacing: normal;
	text-transform: none;
	/* Many scripts come from a fallback font without a bold face; see KioskBoard's digits. */
	font-synthesis: weight;
	animation: ${fadeIn} 0.4s ease-out;

	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}
`;

/**
 * One piece of copy in English, with the rotating language underneath it — every heading, message,
 * and count on the display goes through this, so none of them can forget the second language.
 */
export function Bilingual({ text }: { text: KioskText }) {
	const { primary, secondary } = useKioskLanguages();

	return (
		<>
			<Primary>{text(primary.copy, primary.numerals)}</Primary>
			{secondary ? (
				// Keyed so the fade replays each time the language changes.
				<Secondary key={secondary.locale} lang={secondary.locale} dir="auto">
					{text(secondary.copy, secondary.numerals)}
				</Secondary>
			) : null}
		</>
	);
}
