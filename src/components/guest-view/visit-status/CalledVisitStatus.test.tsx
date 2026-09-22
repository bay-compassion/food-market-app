import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { translations } from '@/locales.ts';

import { LINE_POSITION_INDICATOR_FLAG_KEY } from '../../hooks/use-line-position-indicator-enabled';
import { StaticLDProvider } from '../../StaticLDProvider';
import { CalledVisitStatus } from './CalledVisitStatus';

const copy = translations.en.guestView.visitStatus.called;

describe('CalledVisitStatus', () => {
	it('shows the line position indicator when the flag has no value', () => {
		// Arrange & Act
		const { container } = render(
			<StaticLDProvider>
				<CalledVisitStatus copy={copy} />
			</StaticLDProvider>,
		);

		// Assert
		expect(container.querySelector('.called-cart-line')).not.toBeNull();
	});

	it('hides the line position indicator when the flag is off', () => {
		// Arrange & Act
		const { container } = render(
			<StaticLDProvider flags={{ [LINE_POSITION_INDICATOR_FLAG_KEY]: false }}>
				<CalledVisitStatus copy={copy} />
			</StaticLDProvider>,
		);

		// Assert
		expect(container.querySelector('.called-cart-line')).toBeNull();
	});
});
