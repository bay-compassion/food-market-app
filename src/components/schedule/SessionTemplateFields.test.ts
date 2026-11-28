import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { draftFrom, templateFrom } from './SessionTemplateFields';

const zone = 'America/Los_Angeles';
const template = {
	registrationOpensAt: '10:30',
	registrationDurationMinutes: 15,
	capacity: 30,
	lotteryDelayMinutes: null,
	autoCloseAfterMinutes: 720,
	shoppingStartsAt: '11:30',
};

describe('session template drafts', () => {
	it('keeps the shopping time through a draft', () => {
		// Arrange
		const draft = draftFrom(template, zone);

		// Act
		const saved = templateFrom(draft);

		// Assert
		expect(saved).toEqual(template);
	});

	it('keeps no shopping time as none', () => {
		// Arrange
		const draft = draftFrom({ ...template, shoppingStartsAt: null }, zone);

		// Act
		const saved = templateFrom(draft);

		// Assert
		expect(saved?.shoppingStartsAt).toBeNull();
	});

	it('refuses to save a half-typed shopping time', () => {
		// Arrange
		const draft = { ...draftFrom(template, zone), shoppingStartsAt: DateTime.invalid('typing') };

		// Act
		const saved = templateFrom(draft);

		// Assert
		expect(saved).toBeNull();
	});
});
