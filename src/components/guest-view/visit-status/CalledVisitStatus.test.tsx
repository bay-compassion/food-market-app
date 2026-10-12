import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { translations } from '@/locales.ts';

import { QueueNumber } from '../../../models/queue-number';
import { RootStoreProvider } from '../../../stores/react/store-context';
import { RootStore } from '../../../stores/root.store';
import { LINE_POSITION_INDICATOR_FLAG_KEY } from '../../hooks/use-line-position-indicator';
import { StaticLDProvider } from '../../StaticLDProvider';
import { CalledVisitStatus } from './CalledVisitStatus';

const copy = translations.en.guestView.visitStatus;

describe('CalledVisitStatus', () => {
	it('shows the line position indicator for guests-ahead', () => {
		// Arrange & Act
		const { container } = render(
			<StaticLDProvider flags={{ [LINE_POSITION_INDICATOR_FLAG_KEY]: 'guests-ahead' }}>
				<RootStoreProvider store={new RootStore()}>
					<CalledVisitStatus copy={copy} queueNumber={QueueNumber.main(42)} />
				</RootStoreProvider>
			</StaticLDProvider>,
		);

		// Assert
		expect(container.querySelector('.called-cart-line')).not.toBeNull();
	});

	it.each([undefined, 'now-calling', 'none'])(
		'hides the line position indicator for %s',
		(indicator) => {
			// Arrange & Act
			const { container } = render(
				<StaticLDProvider
					flags={indicator === undefined ? {} : { [LINE_POSITION_INDICATOR_FLAG_KEY]: indicator }}
				>
					<RootStoreProvider store={new RootStore()}>
						<CalledVisitStatus copy={copy} queueNumber={QueueNumber.main(42)} />
					</RootStoreProvider>
				</StaticLDProvider>,
			);

			// Assert
			expect(container.querySelector('.called-cart-line')).toBeNull();
		},
	);

	it('keeps the guest’s number on the board, in either series', () => {
		// Arrange
		const numbers = [QueueNumber.main(42), QueueNumber.priority(1)];

		// Act
		const boards = numbers.map((queueNumber) => {
			const { container, unmount } = render(
				<StaticLDProvider flags={{}}>
					<RootStoreProvider store={new RootStore()}>
						<CalledVisitStatus copy={copy} queueNumber={queueNumber} />
					</RootStoreProvider>
				</StaticLDProvider>,
			);
			const text = container.querySelector('.queue-number-board')?.textContent;

			unmount();

			return text;
		});

		// Assert
		expect(boards).toEqual([`${copy.yourNumberLabel}42`, `${copy.yourNumberLabel}P1`]);
	});

	it('shows no board for a visit called without a number', () => {
		// Arrange & Act
		const { container } = render(
			<StaticLDProvider flags={{}}>
				<RootStoreProvider store={new RootStore()}>
					<CalledVisitStatus copy={copy} queueNumber={null} />
				</RootStoreProvider>
			</StaticLDProvider>,
		);

		// Assert
		expect(container.querySelector('.queue-number-board')).toBeNull();
	});
});
