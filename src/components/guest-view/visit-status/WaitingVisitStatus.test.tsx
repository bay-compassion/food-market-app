import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { translations } from '@/locales.ts';

import { LINE_POSITION_INDICATOR_FLAG_KEY } from '../../hooks/use-line-position-indicator';
import { StaticLDProvider } from '../../StaticLDProvider';
import { WaitingVisitStatus } from './WaitingVisitStatus';

const copy = translations.en.guestView.visitStatus;

function renderWithIndicator(
	indicator: string | undefined,
	visit: { queuePosition: number; guestsAhead: number; nowCalling: number | null } = {
		queuePosition: 7,
		guestsAhead: 6,
		nowCalling: 3,
	},
) {
	return render(
		<StaticLDProvider
			flags={indicator === undefined ? {} : { [LINE_POSITION_INDICATOR_FLAG_KEY]: indicator }}
		>
			<WaitingVisitStatus copy={copy} {...visit} />
		</StaticLDProvider>,
	);
}

describe('WaitingVisitStatus', () => {
	it.each([undefined, 'something-new'])('shows only the queue position for %s', (indicator) => {
		// Arrange & Act
		const { container } = renderWithIndicator(indicator);

		// Assert
		expect(container.querySelector('.queue-position')).not.toBeNull();
		expect(container.querySelector('.guests-ahead')).toBeNull();
		expect(container.querySelector('.now-calling')).toBeNull();
	});

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
			queuePosition: 1,
			guestsAhead: 0,
			nowCalling: null,
		});

		// Assert
		expect(getByRole('status').textContent).toContain(copy.waiting.nowCallingNone);
	});

	it('shows only the queue position for none', () => {
		// Arrange & Act
		const { container } = renderWithIndicator('none');

		// Assert
		expect(container.querySelector('.queue-position')).not.toBeNull();
		expect(container.querySelector('.guests-ahead')).toBeNull();
		expect(container.querySelector('.now-calling')).toBeNull();
	});
});
