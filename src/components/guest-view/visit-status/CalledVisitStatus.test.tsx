import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { translations } from '@/locales.ts';

import { LINE_POSITION_INDICATOR_FLAG_KEY } from '../../hooks/use-line-position-indicator';
import { StaticLDProvider } from '../../StaticLDProvider';
import { CalledVisitStatus } from './CalledVisitStatus';

const copy = translations.en.guestView.visitStatus.called;

describe('CalledVisitStatus', () => {
	it('shows the line position indicator for guests-ahead', () => {
		// Arrange & Act
		const { container } = render(
			<StaticLDProvider flags={{ [LINE_POSITION_INDICATOR_FLAG_KEY]: 'guests-ahead' }}>
				<CalledVisitStatus copy={copy} />
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
					<CalledVisitStatus copy={copy} />
				</StaticLDProvider>,
			);

			// Assert
			expect(container.querySelector('.called-cart-line')).toBeNull();
		},
	);
});
