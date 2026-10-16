import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { translations } from '@/locales.ts';

import { LateArrival } from '../../../models/late-arrival';
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
					<CalledVisitStatus
						copy={copy}
						queueNumber={QueueNumber.main(42)}
						nowCalling={null}
						lateArrival={null}
					/>
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
						<CalledVisitStatus
							copy={copy}
							queueNumber={QueueNumber.main(42)}
							nowCalling={null}
							lateArrival={null}
						/>
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
						<CalledVisitStatus
							copy={copy}
							queueNumber={queueNumber}
							nowCalling={null}
							lateArrival={null}
						/>
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
					<CalledVisitStatus copy={copy} queueNumber={null} nowCalling={null} lateArrival={null} />
				</RootStoreProvider>
			</StaticLDProvider>,
		);

		// Assert
		expect(container.querySelector('.queue-number-board')).toBeNull();
	});

	const minutesAgo = (minutes: number) => new LateArrival(new Date(Date.now() - minutes * 60_000));

	function renderCalled(
		queueNumber: QueueNumber,
		{ minutes = 0, nowCalling = 42 }: { minutes?: number; nowCalling?: number } = {},
	) {
		return render(
			<StaticLDProvider flags={{}}>
				<RootStoreProvider store={new RootStore()}>
					<CalledVisitStatus
						copy={copy}
						queueNumber={queueNumber}
						nowCalling={new NowCalling({ nowCalling, called: [nowCalling], calledPriority: [] })}
						lateArrival={minutesAgo(minutes)}
					/>
				</RootStoreProvider>
			</StaticLDProvider>,
		);
	}

	const warmthOf = (container: HTMLElement) =>
		Number(container.querySelector<HTMLElement>('.queue-number-board')?.dataset.warmth);

	it('keeps the now-calling row under the number', () => {
		// Arrange & Act
		const { getByRole } = renderCalled(QueueNumber.main(42));

		// Assert
		expect(getByRole('status').textContent).toBe(`${copy.waiting.nowCallingLabel}42`);
	});

	it('keeps the board green through the first three minutes after the call', () => {
		// Arrange & Act
		const boards = [0, 2.9].map((minutes) => renderCalled(QueueNumber.main(42), { minutes }));

		// Assert
		expect(boards.map(({ container }) => warmthOf(container))).toEqual([0, 0]);
		expect(boards.map(({ container }) => container.querySelector('.sr-only'))).toEqual([
			null,
			null,
		]);
	});

	it('warms the board toward yellow after the grace, full at ten minutes', () => {
		// Arrange
		const boards = [6.5, 10.5, 30].map((minutes) =>
			renderCalled(QueueNumber.main(42), { minutes }),
		);

		// Act
		const warmth = boards.map(({ container }) => warmthOf(container));

		// Assert
		[0.25, 1, 1].forEach((expected, index) => expect(warmth[index]).toBeCloseTo(expected, 1));
	});

	it('says others are waiting only once the board is fully yellow', () => {
		// Arrange
		const cards = [6.5, 10.5].map((minutes) => renderCalled(QueueNumber.main(42), { minutes }));

		// Act
		const said = cards.map(({ container }) => container.textContent ?? '');

		// Assert
		expect(said[0]).toContain(copy.called.details);
		expect(said[0]).not.toContain(copy.called.detailsLate);
		expect(said[1]).toContain(copy.called.detailsLate);
	});

	it('changes the heading to hurry the guest at the same moment', () => {
		// Arrange
		const cards = [6.5, 10.5].map((minutes) => renderCalled(QueueNumber.main(42), { minutes }));

		// Act
		const headings = cards.map(({ container }) => container.querySelector('h2')?.textContent);

		// Assert
		expect(headings).toEqual([copy.called.header, copy.called.headerLate]);
	});

	it('tells a screen reader how long ago the guest was called, once the board warms', () => {
		// Arrange & Act
		const { container } = renderCalled(QueueNumber.main(42), { minutes: 6.5 });

		// Assert
		expect(container.querySelector('.sr-only')?.textContent).toBe(
			copy.called.calledMinutesAgoOther.replace('{minutes}', '6'),
		);
	});

	it('warms a priority number’s board too: lateness is time, not the main series', () => {
		// Arrange & Act
		const { container } = renderCalled(QueueNumber.priority(1), { minutes: 10.5, nowCalling: 49 });

		// Assert
		expect(warmthOf(container)).toBe(1);
	});
});
