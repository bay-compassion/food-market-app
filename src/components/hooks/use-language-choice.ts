import { useCallback } from 'react';
import { flushSync } from 'react-dom';

import { useRootStore } from '../../stores/react/store-context';
import type { Language } from '../../stores/translation.store';
import { useGuestTourEnabled } from './use-guest-tour-enabled';

/** The id of the app bar's language select, which the first-visit introduction folds into. */
export const appBarLanguagePickerId = 'app-bar-language-picker';

/**
 * Chooses a guest's language. The first choice also dismisses the first-visit introduction, and
 * where the browser supports it, the introduction visibly folds into the app bar's language picker
 * (they share the `language-picker` view-transition name), so the guest sees where the choice now
 * lives instead of the screen silently changing under them. Once it has, the guided tour is offered,
 * where the `guest-tour` flag is on.
 */
export function useLanguageChoice(): (language: Language) => void {
	const rootStore = useRootStore();
	const tourEnabled = useGuestTourEnabled();

	// Not offered at all while the flag is off: an offer would leave the tour running unseen, to
	// appear over the screen the moment the flag turned on.
	const offerTour = useCallback(() => {
		if (tourEnabled) {
			rootStore.tour.offer();
		}
	}, [rootStore, tourEnabled]);

	return useCallback(
		(language: Language) => {
			if (rootStore.guest.isReturningVisitor) {
				rootStore.chooseLanguage(language);

				return;
			}

			const keyboardUser = isKeyboardFocused(document.activeElement);
			const choose = () => {
				// The view transition snapshots the DOM when this callback returns, so React has to
				// commit the store change synchronously rather than on its next scheduled render.
				flushSync(() => rootStore.chooseLanguage(language));
			};

			if (
				typeof document.startViewTransition !== 'function' ||
				window.matchMedia('(prefers-reduced-motion: reduce)').matches
			) {
				choose();

				if (keyboardUser) {
					focusAppBarPicker();
				}

				offerTour();

				return;
			}

			const transition = document.startViewTransition(choose);

			void transition.finished.then(() => {
				const picker = document.getElementById(appBarLanguagePickerId);

				if (keyboardUser) {
					focusAppBarPicker();
				}

				picker?.parentElement?.animate(
					[{ backgroundColor: 'rgb(255 255 255 / 0.35)' }, { backgroundColor: 'transparent' }],
					{ duration: 900, easing: 'ease-out' },
				);

				// Only now: started inside the transition, the tour's overlay would be captured in its
				// snapshot and positioned against the layout the introduction is about to vacate.
				offerTour();
			});
		},
		[rootStore, offerTour],
	);
}

/**
 * The button a keyboard user pressed is gone, so their focus would fall back to `<body>`; the app
 * bar picker is where the same choice now lives. A guest who tapped is left alone: browsers draw a
 * select's focus ring even after a programmatic focus, which would linger on a phone.
 */
function focusAppBarPicker(): void {
	document.getElementById(appBarLanguagePickerId)?.focus({ preventScroll: true });
}

function isKeyboardFocused(element: Element | null): boolean {
	try {
		return element?.matches(':focus-visible') ?? false;
	} catch {
		// Environments without `:focus-visible` support (jsdom) throw on the selector.
		return false;
	}
}
