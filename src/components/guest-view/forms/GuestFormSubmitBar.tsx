import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useRef, type ReactNode } from 'react';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { useOnScreenKeyboard } from '../../hooks/use-on-screen-keyboard';
import { usePinnedOverContent } from '../../hooks/use-pinned-over-content';

/*
 * One beat per cycle, then a rest: the movement takes the first part of the cycle and the button is
 * still for the remainder, so a looping pulse reads as a heartbeat rather than a vibration.
 */
const swell = keyframes`
	0%, 45%, 100% { transform: scale(1); filter: none; }
	20% { transform: scale(1.04); filter: drop-shadow(0 0 7px var(--color-brand)); }
`;

const ring = keyframes`
	0% { transform: scale(1); opacity: 0.7; }
	50%, 100% { transform: scale(1.14, 1.8); opacity: 0; }
`;

const Bar = styled.div`
	display: grid;
	gap: 18px;

	&[data-sticky] {
		position: sticky;
		bottom: 0;
		z-index: 1;
		gap: 10px;
		padding-block: 12px calc(12px + env(safe-area-inset-bottom));
		/* The page's own background, so the bar reads as part of the form it sits under. */
		background: var(--color-background);

		button[type='submit'] {
			min-height: 48px;
		}
	}

	/*
	 * Until every field is filled in, the button is drawn in outline so it reads as "not yet" — but
	 * it is never disabled. Tapped early, the browser's own validation takes the guest to the first
	 * missing field and says what it needs, which a disabled button would silently withhold.
	 */
	&[data-awaiting] button[type='submit']:not(:disabled) {
		color: var(--color-brand);
		background: var(--color-surface-soft);
		box-shadow: inset 0 0 0 2px var(--color-brand);
	}

	/* Once every field is filled in, a brand edge draws the eye down to the button. */
	&[data-sticky][data-ready] {
		box-shadow: 0 -3px 0 var(--color-brand);
	}

	/*
	 * Only while the form scrolls under the bar does it cast a shadow, upward, to mark the edge; at
	 * rest at the end of the form it is the page's own white, with nothing setting it apart.
	 */
	&[data-sticky][data-pinned] {
		box-shadow: 0 -14px 16px -12px rgb(30 71 77 / 18%);
	}

	&[data-sticky][data-pinned][data-ready] {
		box-shadow:
			0 -3px 0 var(--color-brand),
			0 -14px 16px -12px rgb(30 71 77 / 18%);
	}

	/*
	 * A bar pinned to the bottom would ride up on the keyboard and sit on the field being typed into,
	 * so while the keyboard is up it drops back into the flow. That costs no layout shift: a sticky
	 * element already holds its place at the end of the form.
	 */
	&[data-sticky][data-keyboard] {
		position: static;
		box-shadow: none;
	}

	/*
	 * The pulse, for as long as the form is complete and the keyboard is down — while it is up, the
	 * bar is often off screen. The delay lets the guest's finger lift first, and gives a returning
	 * guest's prefilled form a moment to settle before it starts.
	 */
	&[data-pulse] button[type='submit'] {
		animation: ${swell} 1800ms ease-in-out 400ms infinite;

		&::after {
			position: absolute;
			inset: 0;
			border: 3px solid var(--color-brand);
			border-radius: inherit;
			/* Hidden outside the animation, so the ring never shows during the delay. */
			opacity: 0;
			animation: ${ring} 1800ms ease-out 400ms infinite;
			content: '';
			pointer-events: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		&[data-pulse] button[type='submit'] {
			animation: none;

			&::after {
				content: none;
			}
		}
	}
`;

const SubmissionError = styled.p`
	margin: 0;
	color: var(--color-error);
	font-size: 13px;
	line-height: 1.4;
`;

type GuestFormSubmitBarProps = {
	submitLabel: string;
	submittingLabel: string;
	sticky: boolean;
	/** Whether the form is complete; `undefined` for a form that has no such moment. */
	ready: boolean | undefined;
	/** What is left before the form is ready, shown until it is. */
	progress?: ReactNode;
};

/**
 * The guest form's submit button, with the submission error and, for the market registration, what
 * is left before the form is complete. The error sits here so a guest who taps a pinned button sees
 * it fail; the checklist sits here because the button is what it leads to.
 */
export const GuestFormSubmitBar = observer(function GuestFormSubmitBar({
	submitLabel,
	submittingLabel,
	sticky,
	ready,
	progress,
}: GuestFormSubmitBarProps) {
	const t = useTranslation();
	const { registration } = useRootStore();
	const keyboardOpen = useOnScreenKeyboard();
	const bar = useRef<HTMLDivElement>(null);
	const pinned = usePinnedOverContent(bar);
	const isReady = ready === true;

	return (
		<Bar
			ref={bar}
			className="submit-bar"
			data-sticky={sticky || undefined}
			// The keyboard puts the bar back in the flow, where there is nothing under it to mark.
			data-pinned={(pinned && !keyboardOpen) || undefined}
			data-keyboard={keyboardOpen || undefined}
			data-ready={isReady || undefined}
			// Only a form that has a ready moment (one passing `ready`) can be awaiting it.
			data-awaiting={ready === false || undefined}
			// Not while submitting: a disabled button that keeps beckoning would invite a second tap.
			data-pulse={(isReady && !keyboardOpen && !registration.isSubmitting) || undefined}
		>
			{isReady ? null : progress}
			{registration.submissionError ? (
				<SubmissionError className="submission-error" role="alert">
					{t.submissionError}
				</SubmissionError>
			) : null}
			<Button type="submit" disabled={registration.isSubmitting} size="large">
				{registration.isSubmitting ? submittingLabel : submitLabel}
			</Button>
		</Bar>
	);
});
