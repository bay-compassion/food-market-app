import { describe, expect, it } from 'vitest';

import { coversViewport } from './use-on-screen-keyboard';

describe('coversViewport', () => {
	it('treats a keyboard-sized loss of height as a keyboard', () => {
		// Arrange
		const viewport = { height: 812 - 291, scale: 1 };

		// Act
		const covered = coversViewport(812, viewport);

		// Assert
		expect(covered).toBe(true);
	});

	it('ignores a toolbar-sized loss of height', () => {
		// Arrange
		const viewport = { height: 812 - 80, scale: 1 };

		// Act
		const covered = coversViewport(812, viewport);

		// Assert
		expect(covered).toBe(false);
	});

	it('does not mistake pinch zoom for a keyboard', () => {
		// Arrange: zoomed to twice the size, the visual viewport shows half the page.
		const viewport = { height: 406, scale: 2 };

		// Act
		const covered = coversViewport(812, viewport);

		// Assert
		expect(covered).toBe(false);
	});
});
