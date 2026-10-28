import type { Placement } from 'react-joyride';

import type { GuestTourTranslations } from '../../../locales';

export type GuestTourStepId = keyof GuestTourTranslations['steps'];

/** How one step of the tour is anchored to the screen. */
export interface GuestTourStepDefinition {
	id: GuestTourStepId;
	/**
	 * The element the step points at, by its `data-tour` attribute (and, where the tagged element is
	 * too tall to spotlight on a phone, a selector within it). A step without one, or whose element
	 * this market state does not render, is shown centered: the market-day steps describe screens
	 * that only a session's own transitions can reach, so they are told rather than shown.
	 */
	anchor?: string;
	/** For an anchor in the sticky app bar, which must not be scrolled to. */
	fixed?: boolean;
	placement?: Placement;
}

/** The tour, in order: roughly the help page's steps, then the market day after sign-up. */
export const guestTourSteps: readonly GuestTourStepDefinition[] = [
	{ id: 'welcome' },
	{ id: 'language', anchor: '[data-tour="language"]', fixed: true, placement: 'bottom' },
	{ id: 'countdown', anchor: '[data-tour="registration-countdown"]' },
	// The form's first section heading: who the guest is, or for a returning guest, their household.
	{ id: 'form', anchor: '[data-tour="registration-form"] legend' },
	{ id: 'textUpdates', anchor: '[data-tour="text-updates"]' },
	{ id: 'lottery' },
	{ id: 'line' },
	{ id: 'turn' },
	{ id: 'help', anchor: '[data-tour="help"]', fixed: true, placement: 'bottom' },
	{ id: 'replay', anchor: '[data-tour="menu"]', fixed: true, placement: 'bottom' },
];
