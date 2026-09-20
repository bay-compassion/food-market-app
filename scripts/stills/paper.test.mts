import { describe, expect, it } from 'vitest';

import { pageSize } from './paper.mjs';

describe('pageSize', () => {
	it('leaves the paper as it is when portrait', () => {
		// Arrange
		const paper = 'letter';

		// Act
		const size = pageSize(paper, 'portrait');

		// Assert
		expect(size).toEqual({ widthIn: 8.5, heightIn: 11 });
	});

	it('turns the page on its side when landscape', () => {
		// Arrange
		const paper = 'a4';

		// Act
		const size = pageSize(paper, 'landscape');

		// Assert
		expect(size).toEqual({ widthIn: 11.69, heightIn: 8.27 });
	});
});
