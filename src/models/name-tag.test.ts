import { describe, expect, it } from 'vitest';

import { NameTag, type NameTagSource } from './name-tag';

const maria: NameTagSource = {
	firstName: 'Maria',
	lastName: 'Garcia',
	queuePosition: 14,
	priorityNumber: null,
	locale: 'es',
};

describe('NameTag', () => {
	it('shortens the last name to its initial', () => {
		// Arrange
		const tag = new NameTag(maria);

		// Act
		const name = tag.name;

		// Assert
		expect(name).toBe('Maria G.');
	});

	it('shows the first name alone when there is no last name', () => {
		// Arrange
		const tags = ['', '   '].map((lastName) => new NameTag({ ...maria, lastName }));

		// Act
		const names = tags.map((tag) => tag.name);

		// Assert
		expect(names).toEqual(['Maria', 'Maria']);
	});

	it('keeps a multi-word first name whole and capitalizes a lowercase particle', () => {
		// Arrange
		const tag = new NameTag({ ...maria, firstName: ' Ana Lucia ', lastName: 'de la Cruz' });

		// Act
		const name = tag.name;

		// Assert
		expect(name).toBe('Ana Lucia D.');
	});

	it('carries how to say the name, trimmed, and nothing when nobody wrote it', () => {
		// Arrange
		const tags = [' mah-REE-ah ', '  ', null, undefined].map(
			(pronunciation) => new NameTag({ ...maria, pronunciation }),
		);

		// Act
		const pronunciations = tags.map((tag) => tag.pronunciation);

		// Assert
		expect(pronunciations).toEqual(['mah-REE-ah', null, null, null]);
	});

	it('sets a long name smaller so it still fits the label', () => {
		// Arrange
		const short = new NameTag(maria);
		const long = new NameTag({ ...maria, firstName: 'Maximiliana' });

		// Act
		const sizes = [short.isLongName, long.isLongName];

		// Assert
		expect(sizes).toEqual([false, true]);
	});

	it('carries the queue number in either series, or none for a visit the draw has not placed', () => {
		// Arrange
		const placed = new NameTag(maria);
		const front = new NameTag({ ...maria, queuePosition: null, priorityNumber: 2 });
		const unplaced = new NameTag({ ...maria, queuePosition: null });

		// Act
		const numbers = [placed, front, unplaced].map((tag) => tag.number?.label ?? null);

		// Assert
		expect(numbers).toEqual(['14', 'P2', null]);
	});

	it('writes the registration language as an uppercase code', () => {
		// Arrange
		const tag = new NameTag({ ...maria, locale: 'zh' });

		// Act
		const code = tag.languageCode;

		// Assert
		expect(code).toBe('ZH');
	});
});
