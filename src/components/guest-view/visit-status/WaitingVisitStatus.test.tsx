import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { translations } from '@/locales.ts';

import { LINE_POSITION_INDICATOR_FLAG_KEY } from '../../hooks/use-line-position-indicator-enabled';
import { StaticLDProvider } from '../../StaticLDProvider';
import { WaitingVisitStatus } from './WaitingVisitStatus';

const copy = translations.en.guestView.visitStatus;

describe('WaitingVisitStatus', () => {
	it('shows the guests-ahead count when the flag has no value', () => {
		// Arrange & Act
		const { container } = render(
			<StaticLDProvider>
				<WaitingVisitStatus copy={copy} queuePosition={7} guestsAhead={6} />
			</StaticLDProvider>,
		);

		// Assert
		expect(container.querySelector('.guests-ahead')).not.toBeNull();
	});

	it('hides the guests-ahead count when the flag is off', () => {
		// Arrange & Act
		const { container } = render(
			<StaticLDProvider flags={{ [LINE_POSITION_INDICATOR_FLAG_KEY]: false }}>
				<WaitingVisitStatus copy={copy} queuePosition={7} guestsAhead={6} />
			</StaticLDProvider>,
		);

		// Assert
		expect(container.querySelector('.guests-ahead')).toBeNull();
	});
});
