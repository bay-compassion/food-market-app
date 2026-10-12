import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { translations } from '@/locales.ts';

import { NowCalling } from '../../../models/now-calling';
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
					<CalledVisitStatus copy={copy} queueNumber={QueueNumber.main(42)} nowCalling={null} />
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
						<CalledVisitStatus copy={copy} queueNumber={QueueNumber.main(42)} nowCalling={null} />
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
						<CalledVisitStatus copy={copy} queueNumber={queueNumber} nowCalling={null} />
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
					<CalledVisitStatus copy={copy} queueNumber={null} nowCalling={null} />
				</RootStoreProvider>
			</StaticLDProvider>,
		);

		// Assert
		expect(container.querySelector('.queue-number-board')).toBeNull();
	});

	function renderCalled(queueNumber: QueueNumber, nowCalling: number, called: number[] = []) {
		return render(
			<StaticLDProvider flags={{}}>
				<RootStoreProvider store={new RootStore()}>
					<CalledVisitStatus
						copy={copy}
						queueNumber={queueNumber}
						nowCalling={new NowCalling({ nowCalling, called, calledPriority: [] })}
					/>
				</RootStoreProvider>
			</StaticLDProvider>,
		);
	}

	it('keeps the now-calling row under the number', () => {
		// Arrange & Act
		const { getByRole } = renderCalled(QueueNumber.main(42), 42, [42]);

		// Assert
		expect(getByRole('status').textContent).toBe(`${copy.waiting.nowCallingLabel}42`);
	});

	it('keeps the board green while the guest’s own number is the one being called', () => {
		// Arrange & Act
		const { container } = renderCalled(QueueNumber.main(42), 42, [42]);

		// Assert
		expect(container.querySelector<HTMLElement>('.queue-number-board')?.dataset.warmth).toBe('0');
		expect(container.querySelector('.sr-only')).toBeNull();
	});

	it('warms the board toward yellow as the line moves past a late guest, full at five', () => {
		// Arrange
		const late = [43, 45, 47, 52].map((nowCalling) =>
			renderCalled(QueueNumber.main(42), nowCalling),
		);

		// Act
		const warmth = late.map(
			({ container }) =>
				container.querySelector<HTMLElement>('.queue-number-board')?.dataset.warmth,
		);

		// Assert
		expect(warmth).toEqual(['0.2', '0.6', '1', '1']);
	});

	it('tells a screen reader how far the line has moved, since the colour cannot', () => {
		// Arrange
		const late = [43, 45].map((nowCalling) => renderCalled(QueueNumber.main(42), nowCalling));

		// Act
		const read = late.map(({ container }) => container.querySelector('.sr-only')?.textContent);

		// Assert
		expect(read).toEqual([
			copy.called.sinceYoursOne,
			copy.called.sinceYoursOther.replace('{count}', '3'),
		]);
	});

	it('cannot say how late a priority number is, so its board stays green', () => {
		// Arrange & Act
		const { container } = renderCalled(QueueNumber.priority(1), 49);

		// Assert
		expect(container.querySelector('.now-calling')).not.toBeNull();
		expect(container.querySelector<HTMLElement>('.queue-number-board')?.dataset.warmth).toBe('0');
	});
});
