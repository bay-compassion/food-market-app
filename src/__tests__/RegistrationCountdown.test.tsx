import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RegistrationCountdown } from '../components/RegistrationCountdown';
import { translations } from '../locales';
import { SessionStatusEnum } from '../services/sessionStateMachine';
import { RootStoreProvider } from '../stores/react/store-context';
import { RootStore } from '../stores/root.store';

function scheduledToOpenIn(minutes: number) {
	const opensAt = Date.now() + minutes * 60_000;

	return {
		id: 'countdown-opening',
		status: SessionStatusEnum.SCHEDULED,
		capacity: 3,
		registrationOpensAt: new Date(opensAt).toISOString(),
		registrationClosesAt: new Date(opensAt + 15 * 60_000).toISOString(),
	};
}

describe('RegistrationCountdown', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('appears ten minutes before registration opens, counting down to it', () => {
		// Arrange
		vi.useFakeTimers();
		const store = new RootStore();

		store.session.applyServerState({ event: scheduledToOpenIn(11), questions: [], counts: {} });
		const { unmount } = render(
			<RootStoreProvider store={store}>
				<RegistrationCountdown />
			</RootStoreProvider>,
		);

		expect(screen.queryByText(translations.en.registrationOpensIn)).toBeNull();

		// Act
		act(() => {
			vi.advanceTimersByTime(60_000);
		});

		// Assert
		expect(screen.getByText(translations.en.registrationOpensIn)).toBeTruthy();
		expect(screen.getByText('10:00')).toBeTruthy();
		unmount();
		store[Symbol.dispose]();
	});

	it('can close and reopen registration while the countdown remains mounted', () => {
		// Arrange
		const store = new RootStore();
		const event = {
			id: 'countdown-transition',
			status: SessionStatusEnum.REGISTRATION_OPEN,
			capacity: 3,
			registrationOpensAt: new Date(Date.now() - 60_000).toISOString(),
			registrationClosesAt: new Date(Date.now() + 60_000).toISOString(),
		};

		store.session.applyServerState({ event, questions: [], counts: {} });
		const { unmount } = render(
			<RootStoreProvider store={store}>
				<RegistrationCountdown />
			</RootStoreProvider>,
		);

		expect(screen.getByText(translations.en.registrationClosesIn)).toBeTruthy();

		// Act
		act(() =>
			store.session.applyServerState({
				event: { ...event, status: SessionStatusEnum.REGISTRATION_CLOSED },
				questions: [],
				counts: {},
			}),
		);

		// Assert
		expect(screen.queryByText(translations.en.registrationClosesIn)).toBeNull();
		act(() => store.session.applyServerState({ event, questions: [], counts: {} }));
		expect(screen.getByText(translations.en.registrationClosesIn)).toBeTruthy();
		unmount();
		store[Symbol.dispose]();
	});
});
