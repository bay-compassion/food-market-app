import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { type EventData, Joyride, STATUS, type Step } from 'react-joyride';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { type GuestTourStepDefinition, guestTourSteps } from './guest-tour-steps';
import { GuestTourTooltip } from './GuestTourTooltip';

/** Above the sticky MUI app bar (1100), below MUI's menus and dialogs (1300). */
const zIndex = 1250;

/**
 * The sticky app bar's height, the registration clock pinned beneath it, and a little air, so a
 * scrolled-to step is not tucked beneath them.
 */
const scrollOffset = 120;

/**
 * Whether the screen shows this step's anchor: the home screen renders different cards in
 * different market states, and on most days the registration form is not one of them.
 */
function isRendered(selector: string): boolean {
	const element = document.querySelector(selector);

	return element !== null && element.getClientRects().length > 0;
}

/**
 * A step points at its anchor when the screen has it, and is told centered when it does not — so
 * every guest hears the whole story, whatever state the market is in when they take the tour.
 */
function toJoyrideStep({ id, anchor, fixed, placement }: GuestTourStepDefinition): Step {
	const data = { id };

	if (anchor && isRendered(anchor)) {
		return { target: anchor, placement: placement ?? 'auto', isFixed: fixed, data, content: id };
	}

	return { target: 'body', placement: 'center', data, content: id };
}

/**
 * The guided tour of the home screen, run while `GuestTourStore.isRunning`. It is lazily loaded,
 * since a guest registering on a phone does not need the tour library to reach the form.
 *
 * The steps are resolved once, when the tour mounts: the market status polls in the background,
 * and Joyride misbehaves when the steps change under it mid-tour.
 */
const GuestTour = observer(function GuestTour() {
	const { tour } = useRootStore();
	const copy = useTranslation().guestView.tour;
	const [steps] = useState(() => guestTourSteps.map(toJoyrideStep));

	function onEvent({ status }: EventData) {
		if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
			tour.finish();
		}
	}

	return (
		<Joyride
			run
			continuous
			steps={steps}
			onEvent={onEvent}
			tooltipComponent={GuestTourTooltip}
			locale={{
				back: copy.back,
				close: copy.close,
				last: copy.done,
				next: copy.next,
				skip: copy.skip,
			}}
			floatingOptions={{ shiftOptions: { padding: 16 } }}
			options={{
				arrowColor: 'var(--color-background)',
				blockTargetInteraction: true,
				buttons: ['back', 'close', 'primary', 'skip'],
				closeButtonAction: 'skip',
				// The tooltip handles Escape itself, ending the tour rather than advancing it.
				dismissKeyAction: false,
				overlayClickAction: false,
				overlayColor: 'rgb(30 71 77 / 0.6)',
				scrollOffset,
				skipBeacon: true,
				spotlightPadding: 6,
				spotlightRadius: 12,
				zIndex,
			}}
		/>
	);
});

export default GuestTour;
