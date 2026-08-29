import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LegalDocumentView } from './LegalDocumentView';

const markdown = [
	'# Privacy Policy',
	'',
	'How we handle your information.',
	'',
	'## Contact',
	'',
	'- Reach us at [the office](/contact)',
].join('\n');

describe('LegalDocumentView', () => {
	it('renders the document from its Markdown', () => {
		// Arrange & Act
		render(<LegalDocumentView backLabel="Back" markdown={markdown} />);

		// Assert
		expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeDefined();
		expect(screen.getByRole('heading', { level: 2, name: 'Contact' })).toBeDefined();
		expect(screen.getByRole('link', { name: 'the office' })).toBeDefined();
	});

	it('offers a real link back, so it can be opened in a new tab', () => {
		// Arrange & Act
		render(<LegalDocumentView backLabel="Back to the app" markdown={markdown} />);

		// Assert
		expect(screen.getByRole('link', { name: 'Back to the app' }).getAttribute('href')).toBe('/');
	});

	it('routes a plain click instead of loading the page', async () => {
		// Arrange
		const user = userEvent.setup();
		const onBack = vi.fn();

		render(<LegalDocumentView backLabel="Back" markdown={markdown} onBack={onBack} />);

		// Act
		await user.click(screen.getByRole('link', { name: 'Back' }));

		// Assert
		expect(onBack).toHaveBeenCalledOnce();
	});

	it('leaves a modified click to the browser', async () => {
		// Arrange — cmd-click means "open in a new tab", which in-app routing must not swallow.
		// The modifier only reaches the click when both come from the same `userEvent` instance.
		const user = userEvent.setup();
		const onBack = vi.fn();

		render(<LegalDocumentView backLabel="Back" markdown={markdown} onBack={onBack} />);

		// Act
		await user.keyboard('{Meta>}');
		await user.click(screen.getByRole('link', { name: 'Back' }));
		await user.keyboard('{/Meta}');

		// Assert
		expect(onBack).not.toHaveBeenCalled();
	});
});
