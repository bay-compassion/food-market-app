import { Global } from '@emotion/react';
import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { type CSSProperties, useEffect } from 'react';

import type { RegistrationClock, RegistrationClockPhase } from '../models/registration-clock';
import { useRootStore } from '../stores/react/store-context';
import { useTranslation } from '../stores/react/use-translation';
import { useNow } from './hooks/use-now';
import { useOnScreenKeyboard } from './hooks/use-on-screen-keyboard';
import { RegistrationCountdownIcon } from './RegistrationCountdownIcon';

/** How often to ask the server again while it has yet to say registration is open. */
const openingRetryMs = 1_000;

/** The strip's height, which what the page scrolls to has to clear as well as the app bar. */
const stripHeight = '44px';

/*
 * A strip under the app bar that stays while the guest scrolls. Below the app bar (1100) and above
 * the form, whose outlined field labels sit at `z-index: 1`.
 */
const Countdown = styled.div`
	position: sticky;
	top: var(--app-bar-height);
	z-index: 2;

	/* As the submit bar does: the keyboard leaves too little screen to spend on a pinned strip. */
	&[data-keyboard] {
		position: static;
	}
`;

/**
 * Each phase has a look of its own, so the countdown to opening never reads as the one to closing:
 *
 * - Waiting to open: the soft surface, with an hourglass.
 * - Just opened: solid success green, with a check, between the two countdowns.
 * - Closing: pale like the app's other surfaces until the last five minutes, then the solid warming
 *   colour with white text, which holds its contrast all the way to red — a pale strip blended
 *   toward red would pass through shades no text reads on. `longer hue` routes the blend around
 *   through amber rather than the shorter arc through purple, so it reads as warming up.
 */
const Clock = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	min-height: ${stripHeight};
	padding: 4px 18px;
	color: var(--color-brand-dark);
	background: var(--color-surface-soft);
	border-bottom: 1px solid var(--color-border-soft);
	box-shadow: 0 2px 6px rgb(0 0 0 / 14%);
	text-align: center;

	&[data-phase='opens'],
	&[data-phase='opening'] {
		color: var(--color-text-muted);
		background: var(--color-surface);
	}

	&[data-phase='opened'] {
		color: var(--color-on-brand);
		background: var(--color-success);
		border-bottom: 0;
	}

	&[data-warming] {
		color: var(--color-on-brand);
		background: color-mix(
			in oklch longer hue,
			var(--color-brand),
			var(--color-error) calc(var(--registration-countdown-progress) * 100%)
		);
		/* Against the app bar, which in light mode is the same colour as the warming clock's start. */
		border-top: 1px solid rgb(255 255 255 / 30%);
		border-bottom: 0;
	}
`;

const Label = styled.span`
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 4px;
	font-size: 15px;
	font-weight: 700;
`;

const Digits = styled.span`
	font-family: var(--font-heading);
	font-size: 22px;
	font-weight: 700;
	font-variant-numeric: tabular-nums;
	letter-spacing: 0.02em;
`;

function pad(value: number) {
	return String(value).padStart(2, '0');
}

/**
 * `mm:ss`, the common case for a registration window. The `HH:` segment appears only once there is
 * a full hour or more left, rather than being dropped by a fixed cutoff — so the format always
 * reflects the actual remaining time instead of an assumption about how long windows usually run.
 */
function clockText(remainingMs: number): string {
	const totalSeconds = Math.ceil(remainingMs / 1_000);
	const hours = Math.floor(totalSeconds / 3_600);
	const minutes = Math.floor((totalSeconds % 3_600) / 60);
	const seconds = totalSeconds % 60;

	return hours > 0
		? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
		: `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * A strip pinned under the app bar for the registration window: counting down to opening in its
 * last ten minutes, saying so the moment it opens, then counting down to closing, warming toward
 * the danger color as it runs out.
 */
export const RegistrationCountdown = observer(function RegistrationCountdown() {
	const clock = useRootStore().session.registrationClock;

	return clock ? <ActiveCountdown clock={clock} /> : null;
});

/** Mount the timer only while there is a market to count toward, keeping its hooks unconditional. */
const ActiveCountdown = observer(function ActiveCountdown({ clock }: { clock: RegistrationClock }) {
	const { session } = useRootStore();
	const phase = clock.phaseAt(useNow(1_000));
	const keyboardOpen = useOnScreenKeyboard();
	const opening = phase.kind === 'opening';

	// The poll comes round every few seconds; asking at once, and again until the server agrees,
	// keeps the strip from sitting on "opening" while the guest waits for the form.
	useEffect(() => {
		if (!opening) {
			return;
		}

		const ask = () => void session.getStatus().catch(() => undefined);

		ask();
		const timer = setInterval(ask, openingRetryMs);

		return () => clearInterval(timer);
	}, [opening, session]);

	if (phase.kind === 'hidden') {
		return null;
	}

	return (
		<Countdown
			className="registration-countdown"
			data-tour="registration-countdown"
			data-keyboard={keyboardOpen || undefined}
		>
			{/*
				What the browser scrolls to — a field it is taking the guest to, say — has to clear the
				strip as well as the app bar, or it lands underneath them.
			*/}
			<Global
				styles={{
					html: { scrollPaddingTop: `calc(var(--app-bar-height) + ${stripHeight} + 16px)` },
				}}
			/>
			<PhaseContent phase={phase} />
		</Countdown>
	);
});

function PhaseContent({ phase }: { phase: Exclude<RegistrationClockPhase, { kind: 'hidden' }> }) {
	const t = useTranslation();
	const progress = phase.kind === 'closes' ? phase.progress : 0;
	const icon =
		phase.kind === 'opened'
			? 'opened'
			: phase.kind === 'closes'
				? progress > 0
					? 'warning'
					: null
				: 'waiting';
	const label = {
		opens: t.registrationOpensIn,
		opening: t.registrationOpening,
		opened: t.registrationOpened,
		closes: t.registrationClosesIn,
	}[phase.kind];
	const remainingMs = 'remainingMs' in phase ? phase.remainingMs : null;

	/**
	 * A screen reader announcing the clock every second would be unusable, so the accessible text
	 * is kept to whole minutes — it changes once a minute even though the visible clock ticks every
	 * second (and is hidden from assistive technology).
	 */
	const accessibleText =
		remainingMs === null
			? label
			: (phase.kind === 'opens'
					? t.registrationOpensInMinutes
					: t.registrationClosesInMinutes
				).replace('{minutes}', String(Math.ceil(remainingMs / 60_000)));

	return (
		<>
			<Clock
				className="registration-countdown-clock"
				data-phase={phase.kind}
				data-warming={progress > 0 || undefined}
				style={{ '--registration-countdown-progress': progress } as CSSProperties}
				aria-hidden="true"
			>
				<Label className="registration-countdown-label">
					{icon ? <RegistrationCountdownIcon kind={icon} /> : null}
					{label}
				</Label>
				{remainingMs === null ? null : (
					<Digits className="registration-countdown-digits">{clockText(remainingMs)}</Digits>
				)}
			</Clock>
			<span className="sr-only">{accessibleText}</span>
		</>
	);
}
