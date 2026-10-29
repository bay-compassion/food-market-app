import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';

import { type Locale, translations } from '../locales';
import { SessionStatusEnum } from '../services/sessionStateMachine';
import { RootStoreProvider } from '../stores/react/store-context';
import { RootStore } from '../stores/root.store';
import { RegistrationCountdown } from './RegistrationCountdown';

/**
 * The strip `GuestHome` pins under the app bar, above the registration form or the guest's lottery
 * card. In the last ten minutes before registration opens it counts down to opening, with an
 * hourglass; when it opens it says so, in green, for ten seconds; then it counts down to closing.
 * Each phase looks different, so the two countdowns are never mistaken for each other.
 *
 * The background blends from brand to danger color via CSS `color-mix()`, driven by a
 * `--registration-countdown-progress` custom property (`0` = brand, `1` = danger) rather than
 * snapping between fixed swatches. The blend starts at five minutes remaining.
 */
type CountdownArgs = {
	locale: Locale;
	hoursRemaining: number;
	minutesRemaining: number;
	secondsRemaining: number;
	/**
	 * Which registration edge the clock counts toward. `opened` is registration a few seconds after
	 * it opens; `opening` is opening time reached before the server has said so.
	 */
	edge: 'opens' | 'opening' | 'opened' | 'closes';
};

function progressOf(canvasElement: HTMLElement) {
	const clock = canvasElement.querySelector('.registration-countdown-clock') as HTMLElement | null;

	return Number(clock?.style.getPropertyValue('--registration-countdown-progress'));
}

/**
 * The warning icon is the non-color signal that the clock has started blending toward the danger
 * color — color alone doesn't reliably read as "time is running out" for red-green color blindness.
 */
function hasWarning(canvasElement: HTMLElement) {
	return canvasElement.querySelector('.registration-countdown-icon-warning') !== null;
}

/**
 * The component reads an absolute `closesAt` from the session store; a story is easier to drive —
 * and to read — in terms of how much time is left, so this seeds the matching server state.
 */
function RemainingTime({
	locale,
	hoursRemaining,
	minutesRemaining,
	secondsRemaining,
	edge,
}: CountdownArgs) {
	const remainingMs = (hoursRemaining * 3_600 + minutesRemaining * 60 + secondsRemaining) * 1_000;
	const [store] = useState(() => {
		const now = Date.now();
		// Asked again at opening time; left unanswered, so the story holds on "opening".
		const seeded = new RootStore({ session: { fetch: () => new Promise(() => {}) } });
		const scheduled = edge === 'opens' || edge === 'opening';
		const opensAt = {
			opens: now + remainingMs,
			opening: now - 1_000,
			opened: now - 2_000,
			closes: now - 60_000,
		}[edge];
		const closesAt = edge === 'closes' ? now + remainingMs : opensAt + 15 * 60_000;

		seeded.translations.setLanguage(locale);
		seeded.session.applyServerState({
			event: {
				id: 'countdown-story',
				status: scheduled ? SessionStatusEnum.SCHEDULED : SessionStatusEnum.REGISTRATION_OPEN,
				capacity: 100,
				registrationOpensAt: new Date(opensAt).toISOString(),
				registrationClosesAt: new Date(closesAt).toISOString(),
			},
			questions: [],
			counts: {},
		});

		return seeded;
	});

	return (
		<RootStoreProvider store={store}>
			<RegistrationCountdown />
		</RootStoreProvider>
	);
}

/** A fresh store whenever the controls change, rather than one rebuilt on every render. */
function KeyedRemainingTime(args: CountdownArgs) {
	return <RemainingTime key={JSON.stringify(args)} {...args} />;
}

const meta = {
	title: 'Guest/Market Page/Registration Countdown',
	component: KeyedRemainingTime,
	parameters: { shell: 'guest' },
	args: {
		locale: 'en',
		hoursRemaining: 0,
		minutesRemaining: 15,
		secondsRemaining: 0,
		edge: 'closes',
	},
} satisfies Meta<typeof KeyedRemainingTime>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Ahead of the threshold, and the common case while a guest fills the form: pale, so it stands apart
 * from the app bar, and pinned under it while the page scrolls.
 */
export const PlentyOfTime: Story = {
	play: async ({ canvas, canvasElement }) => {
		const countdown = canvasElement.querySelector<HTMLElement>('.registration-countdown');

		await expect(canvas.getByText('15:00')).toBeInTheDocument();
		await expect(countdown && getComputedStyle(countdown).position).toBe('sticky');
		await expect(progressOf(canvasElement)).toBe(0);
		await expect(hasWarning(canvasElement)).toBe(false);
	},
};

/**
 * The last ten minutes before registration opens: the strip counts down to opening instead, on
 * white with an hourglass rather than the closing clock's tint.
 */
export const OpensSoon: Story = {
	args: { edge: 'opens', minutesRemaining: 7, secondsRemaining: 30 },
	play: async ({ canvas, canvasElement }) => {
		await expect(canvas.getByText(translations.en.registrationOpensIn)).toBeInTheDocument();
		await expect(canvas.getByText('07:30')).toBeInTheDocument();
		await expect(progressOf(canvasElement)).toBe(0);
	},
};

/** Seconds before opening: good news, so unlike closing the strip never warms or warns. */
export const NearlyOpen: Story = {
	args: { edge: 'opens', minutesRemaining: 0, secondsRemaining: 10 },
	play: async ({ canvasElement }) => {
		await expect(progressOf(canvasElement)).toBe(0);
		await expect(hasWarning(canvasElement)).toBe(false);
	},
};

/**
 * Opening time on this phone, before the server has said registration is open: no clock to show,
 * so the strip says it is opening while the app asks the server again every second.
 */
export const Opening: Story = {
	args: { edge: 'opening' },
	play: async ({ canvasElement }) => {
		await expect(canvasElement.querySelector('.registration-countdown-label')?.textContent).toBe(
			translations.en.registrationOpening,
		);
		await expect(canvasElement.querySelector('.registration-countdown-digits')).toBeNull();
	},
};

/**
 * The moment registration opens: ten seconds of "Registration is open" in green, so the strip does
 * not jump from one countdown straight up to the other.
 */
export const JustOpened: Story = {
	args: { edge: 'opened' },
	play: async ({ canvasElement }) => {
		await expect(canvasElement.querySelector('.registration-countdown-label')?.textContent).toBe(
			translations.en.registrationOpened,
		);
		await expect(canvasElement.querySelector('.registration-countdown-digits')).toBeNull();
	},
};

/** More than ten minutes before registration opens, there is no strip yet. */
export const TooEarlyToCount: Story = {
	args: { edge: 'opens', minutesRemaining: 10, secondsRemaining: 1 },
	play: async ({ canvasElement }) => {
		await expect(canvasElement.querySelector('.registration-countdown')).toBeNull();
	},
};

/**
 * Halfway through the transition window (five minutes, by default) — the background is an even
 * blend of brand and danger color.
 */
export const HalfwayThroughTransition: Story = {
	args: { minutesRemaining: 2, secondsRemaining: 30 },
	play: async ({ canvas, canvasElement }) => {
		await expect(canvas.getByText('02:30')).toBeInTheDocument();
		await expect(progressOf(canvasElement)).toBeCloseTo(0.5, 3);
		await expect(hasWarning(canvasElement)).toBe(true);
	},
};

/** Seconds from closing — the blend is nearly all the way to the danger color. */
export const NearlyClosed: Story = {
	args: { minutesRemaining: 0, secondsRemaining: 10 },
	play: async ({ canvas, canvasElement }) => {
		await expect(canvas.getByText('00:10')).toBeInTheDocument();
		await expect(progressOf(canvasElement)).toBeCloseTo(1, 1);
		await expect(hasWarning(canvasElement)).toBe(true);
	},
};

/**
 * The boundary the hours segment turns on at: one tick past a full hour left, and the display is
 * still `mm:ss`; at exactly an hour, `HH:` appears. Not a fixed cutoff picked because "windows are
 * usually short" — it's driven by the actual remaining time, so there's no length a window could
 * reach where the clock quietly stops making sense.
 */
export const JustUnderAnHour: Story = {
	args: { hoursRemaining: 0, minutesRemaining: 59, secondsRemaining: 59 },
	play: async ({ canvas }) => {
		await expect(canvas.getByText('59:59')).toBeInTheDocument();
	},
};

/** The moment the hours segment appears. */
export const OneHourExactly: Story = {
	args: { hoursRemaining: 1, minutesRemaining: 0, secondsRemaining: 0 },
	play: async ({ canvas }) => {
		await expect(canvas.getByText('01:00:00')).toBeInTheDocument();
	},
};

/** A longer window shows the hours digits rather than rolling over. */
export const OverAnHour: Story = {
	args: { hoursRemaining: 1, minutesRemaining: 23, secondsRemaining: 45 },
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
};
