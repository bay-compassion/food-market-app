import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { translations } from '@/locales.ts';

import { NowCalling } from '../../../models/now-calling';
import { QueueNumber } from '../../../models/queue-number';
import { RootStoreProvider } from '../../../stores/react/store-context';
import { RootStore } from '../../../stores/root.store';
import { LINE_POSITION_INDICATOR_FLAG_KEY } from '../../hooks/use-line-position-indicator';
import { StaticLDProvider } from '../../StaticLDProvider';
import { WaitingVisitStatus } from './WaitingVisitStatus';

const copy = translations.en.guestView.visitStatus;

const calling = (nowCalling: number | null, calledPriority: number[] = [], called: number[] = []) =>
	new NowCalling({ nowCalling, called, calledPriority });

function renderWithIndicator(
	indicator: string | undefined,
	visit: { queueNumber: QueueNumber; guestsAhead: number; nowCalling: NowCalling } = {
		queueNumber: QueueNumber.main(7),
		guestsAhead: 6,
		nowCalling: calling(3),
	},
) {
	return render(
		<StaticLDProvider
			flags={indicator === undefined ? {} : { [LINE_POSITION_INDICATOR_FLAG_KEY]: indicator }}
		>
			<RootStoreProvider store={new RootStore()}>
				<WaitingVisitStatus copy={copy} {...visit} />
			</RootStoreProvider>
		</StaticLDProvider>,
	);
}

describe('WaitingVisitStatus', () => {
	it.each([undefined, 'something-new'])(
		'falls back to the now-calling board for %s',
		(indicator) => {
			// Arrange & Act
			const { container } = renderWithIndicator(indicator);

			// Assert
			expect(container.querySelector('.queue-number-board')).not.toBeNull();
			expect(container.querySelector('.now-calling')).not.toBeNull();
			expect(container.querySelector('.guests-ahead')).toBeNull();
		},
	);

	it('shows the guests-ahead count for guests-ahead', () => {
		// Arrange & Act
		const { container } = renderWithIndicator('guests-ahead');

		// Assert
		expect(container.querySelector('.guests-ahead')).not.toBeNull();
		expect(container.querySelector('.now-calling')).toBeNull();
	});

	it('shows the number being called instead of the guests-ahead count for now-calling', () => {
		// Arrange & Act
		const { getByRole, container } = renderWithIndicator('now-calling');

		// Assert
		expect(getByRole('status').textContent).toBe(`${copy.waiting.nowCallingLabel}3`);
		expect(container.querySelector('.guests-ahead')).toBeNull();
	});

	it('says no number has been called before anyone is called', () => {
		// Arrange & Act
		const { getByRole } = renderWithIndicator('now-calling', {
			queueNumber: QueueNumber.main(1),
			guestsAhead: 0,
			nowCalling: calling(null),
		});

		// Assert
		expect(getByRole('status').textContent).toContain(copy.waiting.nowCallingNone);
	});

	it('shows a priority number being called beside the main one', () => {
		// Arrange & Act
		const { getByRole } = renderWithIndicator('now-calling', {
			queueNumber: QueueNumber.main(42),
			guestsAhead: 4,
			nowCalling: calling(38, [1]),
		});

		// Assert
		expect(getByRole('status').textContent).toBe(`${copy.waiting.nowCallingLabel}38P1`);
	});

	it('heads the board with the guest’s number, in either series', () => {
		// Arrange & Act
		const { container } = renderWithIndicator('now-calling', {
			queueNumber: QueueNumber.priority(2),
			guestsAhead: 1,
			nowCalling: calling(38),
		});

		// Assert
		expect(container.querySelector('.queue-number-board')?.textContent).toBe(
			`${copy.yourNumberLabel}P2`,
		);
	});

	it('shows only the queue number for none', () => {
		// Arrange & Act
		const { container } = renderWithIndicator('none');

		// Assert
		expect(container.querySelector('.queue-number-board')).not.toBeNull();
		expect(container.querySelector('.guests-ahead')).toBeNull();
		expect(container.querySelector('.now-calling')).toBeNull();
	});
});
