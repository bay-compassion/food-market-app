import { Global } from '@emotion/react';
import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { type CSSProperties } from 'react';

import { SessionStatusEnum } from '../services/sessionStateMachine';
import { useRootStore } from '../stores/react/store-context';
import { useTranslation } from '../stores/react/use-translation';
import { useCountdownTimer } from './hooks/use-countdown-timer';
import { useOnScreenKeyboard } from './hooks/use-on-screen-keyboard';

const transitionThresholdMs = 5 * 60_000;

/** The pinned strip's height, which what the page scrolls to has to clear as well as the app bar. */
const pinnedHeight = '44px';

/*
 * Pinned, the clock is a strip under the app bar that stays while the guest scrolls the form. Below
 * the app bar (1100) and above the form, whose outlined field labels sit at `z-index: 1`.
 */
const Countdown = styled.div`
	margin-bottom: 16px;

	&[data-pinned] {
		position: sticky;
		top: var(--app-bar-height);
		z-index: 2;
		margin-bottom: 0;
	}

	/* As the submit bar does: the keyboard leaves too little screen to spend on a pinned strip. */
	&[data-pinned][data-keyboard] {
		position: static;
	}
`;

/**
 * `longer hue` routes the blend around through amber rather than the shorter arc through purple,
 * so the color reads as warming up rather than shifting hue at random.
 */
const Clock = styled.div`
	display: grid;
	gap: 2px;
	padding: 14px 18px;
	border-radius: var(--radius-md);
	color: var(--color-on-brand);
	background: color-mix(
		in oklch longer hue,
		var(--color-brand),
		var(--color-error) calc(var(--registration-countdown-progress) * 100%)
	);
	text-align: center;

	[data-pinned] > & {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: ${pinnedHeight};
		padding: 4px 18px;
		border-radius: 0;
		/* Against the app bar, which in light mode is the same colour as the warming clock's start. */
		border-top: 1px solid rgb(255 255 255 / 30%);
		box-shadow: 0 2px 6px rgb(0 0 0 / 14%);
	}

	/*
	 * Until the last five minutes the strip is pale, so it stands apart from the app bar above it.
	 * Only then does it take the solid warming colour, with white text, which holds its contrast all
	 * the way to red — a pale strip blended toward red would pass through shades no text reads on.
	 */
	[data-pinned] > &:not([data-warming]) {
		color: var(--color-brand-dark);
		background: var(--color-surface-soft);
		border-top: 0;
		border-bottom: 1px solid var(--color-border-soft);
	}
`;

const Label = styled.span`
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 4px;
	font-size: 12px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	opacity: 0.85;

	[data-pinned] & {
		font-size: 15px;
		text-transform: none;
		letter-spacing: normal;
		opacity: 1;
	}
`;

const WarningIcon = styled.svg`
	flex: 0 0 auto;
	width: 14px;
	height: 14px;
`;

const Digits = styled.span`
	font-family: var(--font-heading);
	font-size: 38px;
	font-weight: 700;
	font-variant-numeric: tabular-nums;
	letter-spacing: 0.02em;

	[data-pinned] & {
		font-size: 22px;
	}
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
 * How long is left to register, counting down, warming toward the danger color as it runs out.
 * `pinned` makes it a strip that stays under the app bar while the guest scrolls the form.
 */
export const RegistrationCountdown = observer(function RegistrationCountdown({
	pinned = false,
}: {
	pinned?: boolean;
}) {
	const { session } = useRootStore();
	const closesAt = session.marketEvent?.registrationClosesAt;

	if (session.currentStatus !== SessionStatusEnum.REGISTRATION_OPEN || !closesAt) {
		return null;
	}

	return <ActiveCountdown closesAt={closesAt} pinned={pinned} />;
});

/** Mount the timer only while registration is open, keeping its hooks unconditional. */
const ActiveCountdown = observer(function ActiveCountdown({
	closesAt,
	pinned,
}: {
	closesAt: Date;
	pinned: boolean;
}) {
	const t = useTranslation();
	const remainingMs = useCountdownTimer(closesAt.valueOf());
	const keyboardOpen = useOnScreenKeyboard();

	if (remainingMs <= 0) {
		return null;
	}

	/**
	 * How far into the color transition the clock is: `0` at or above the threshold, `1` at zero
	 * remaining. It is handed to CSS as a custom property so the blend is computed by
	 * `color-mix()` rather than snapped between fixed swatches.
	 */
	const progress = Math.min(1, Math.max(0, 1 - remainingMs / transitionThresholdMs));
	/**
	 * A screen reader announcing the clock every second would be unusable, so the accessible text
	 * is kept to whole minutes — it changes once a minute even though the visible clock ticks every
	 * second (and is hidden from assistive technology).
	 */
	const accessibleText = t.registrationClosesInMinutes.replace(
		'{minutes}',
		String(Math.ceil(remainingMs / 60_000)),
	);

	return (
		<Countdown
			className="registration-countdown"
			data-tour="registration-countdown"
			data-pinned={pinned || undefined}
			data-keyboard={(pinned && keyboardOpen) || undefined}
		>
			{/*
				What the browser scrolls to — a field it is taking the guest to, say — has to clear the
				strip as well as the app bar, or it lands underneath them.
			*/}
			{pinned ? (
				<Global
					styles={{
						html: { scrollPaddingTop: `calc(var(--app-bar-height) + ${pinnedHeight} + 16px)` },
					}}
				/>
			) : null}
			<Clock
				className="registration-countdown-clock"
				data-warming={progress > 0 || undefined}
				style={{ '--registration-countdown-progress': progress } as CSSProperties}
				aria-hidden="true"
			>
				<Label className="registration-countdown-label">
					{/*
						A color blend alone doesn't reliably read as "time is running out" for red-green
						color blindness, so the icon is a redundant, non-color signal for the same
						information — present once the transition has started, gone otherwise.
					*/}
					{progress > 0 ? (
						<WarningIcon
							className="registration-countdown-icon"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							aria-hidden="true"
						>
							<path d="M12 3 2 20h20L12 3Z" strokeLinejoin="round" strokeLinecap="round" />
							<path d="M12 10v4" strokeLinecap="round" />
							<path d="M12 17h.01" strokeLinecap="round" />
						</WarningIcon>
					) : null}
					{t.registrationClosesIn}
				</Label>
				<Digits className="registration-countdown-digits">{clockText(remainingMs)}</Digits>
			</Clock>
			<span className="sr-only">{accessibleText}</span>
		</Countdown>
	);
});
