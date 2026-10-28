import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { useOnScreenKeyboard } from '../../hooks/use-on-screen-keyboard';

/*
 * One beat per cycle, then a rest: the movement takes the first part of the cycle and the button is
 * still for the remainder, so a looping pulse reads as a heartbeat rather than a vibration.
 */
const swell = keyframes`
	0%, 45%, 100% { transform: scale(1); filter: none; }
	20% { transform: scale(1.06); filter: drop-shadow(0 0 10px var(--color-brand)); }
`;

const ring = keyframes`
	0% { transform: scale(1); opacity: 0.9; }
	50%, 100% { transform: scale(1.18, 2); opacity: 0; }
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
		background: var(--color-surface);
		box-shadow: 0 -8px 24px rgb(30 71 77 / 10%);

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
		box-shadow:
			0 -3px 0 var(--color-brand),
			0 -8px 24px rgb(30 71 77 / 10%);
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

/*
 * Always rendered, empty until the form is ready, so screen readers already know it as a live
 * region when the text arrives; inserting a region and its text together often goes unannounced.
 */
const ReadyHint = styled.p`
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	margin: 0;
	color: var(--color-brand);
	font-size: 15px;
	font-weight: 700;
	line-height: 1.35;
	text-align: center;

	&:empty {
		/* Cancels the bar's gap, so the empty hint takes no room. */
		margin-block-end: -10px;
	}

	svg {
		flex: 0 0 auto;
		width: 18px;
		height: 18px;
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
	readyHint: string | null | undefined;
};

/**
 * The guest form's submit button, with the submission error and, for the market registration, the
 * hint that the form is complete. The error sits here so a guest who taps a pinned button sees it
 * fail; the hint sits here because the button is what it points at.
 */
export const GuestFormSubmitBar = observer(function GuestFormSubmitBar({
	submitLabel,
	submittingLabel,
	sticky,
	readyHint,
}: GuestFormSubmitBarProps) {
	const t = useTranslation();
	const { registration } = useRootStore();
	const keyboardOpen = useOnScreenKeyboard();
	const isReady = Boolean(readyHint);

	return (
		<Bar
			className="submit-bar"
			data-sticky={sticky || undefined}
			data-keyboard={keyboardOpen || undefined}
			data-ready={isReady || undefined}
			// Only a form that has a ready moment (one passing `readyHint`) can be awaiting it.
			data-awaiting={readyHint === null || undefined}
			// Not while submitting: a disabled button that keeps beckoning would invite a second tap.
			data-pulse={(isReady && !keyboardOpen && !registration.isSubmitting) || undefined}
		>
			{readyHint !== undefined ? (
				<ReadyHint className="ready-hint" aria-live="polite">
					{readyHint ? (
						<>
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.5"
								aria-hidden="true"
							>
								<path d="M5 12.5l4.5 4.5L19 7.5" />
							</svg>
							{readyHint}
						</>
					) : null}
				</ReadyHint>
			) : null}
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
