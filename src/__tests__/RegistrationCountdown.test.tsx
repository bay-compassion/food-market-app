import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RegistrationCountdown } from '../components/RegistrationCountdown';
import { translations } from '../locales';
import { SessionStatusEnum } from '../services/sessionStateMachine';
import { RootStoreProvider } from '../stores/react/store-context';
import { RootStore } from '../stores/root.store';

describe('RegistrationCountdown', () => {
	it('can close and reopen registration while the countdown remains mounted', () => {
		// Arrange
		const store = new RootStore();
		const event = {
			id: 'countdown-transition',
			status: SessionStatusEnum.REGISTRATION_OPEN,
			sessionMode: 'ad_hoc' as const,
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
