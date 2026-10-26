import { describe, expect, it } from 'vitest';

import { NameTag, type NameTagSource } from './name-tag';

const maria: NameTagSource = {
	visitId: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd7f3a',
	// Midday, so the date is the same in every time zone the tests might run in.
	printedAt: new Date('2026-10-25T12:00:00Z'),
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

	it('ends with the visit id’s last four characters as the reference code, uppercased', () => {
		// Arrange
		const tags = ['1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd7f3a', 'visit-1'].map(
			(visitId) => new NameTag({ ...maria, visitId }),
		);

		// Act
		const references = tags.map((tag) => tag.reference);

		// Assert
		expect(references).toEqual(['7F3A', 'SIT1']);
	});

	it('dates the tag by the day it prints', () => {
		// Arrange
		const tag = new NameTag(maria);

		// Act
		const date = tag.date;

		// Assert
		expect(date).toBe('Oct 25, 2026');
	});

	it('steps the number down in size as it grows longer', () => {
		// Arrange
		const tags = [
			{ queuePosition: 9, priorityNumber: null },
			{ queuePosition: null, priorityNumber: 2 },
			{ queuePosition: 128, priorityNumber: null },
			{ queuePosition: null, priorityNumber: 12 },
			{ queuePosition: 1024, priorityNumber: null },
			{ queuePosition: null, priorityNumber: null },
		].map((number) => new NameTag({ ...maria, ...number }));

		// Act
		const lengths = tags.map((tag) => tag.numberLength);

		// Assert
		expect(lengths).toEqual(['short', 'short', 'medium', 'medium', 'long', 'short']);
	});
});
