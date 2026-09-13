import { describe, expect, it } from 'vitest';

import { ConfirmationStore, type ConfirmationRequest } from './confirmation.store';

const request: ConfirmationRequest = {
	question: 'Close registration now?',
	confirmLabel: 'Continue',
	dismissLabel: 'Cancel',
};

describe('ConfirmationStore', () => {
	it('has nothing pending until something is asked', () => {
		// Arrange / Act
		const confirmation = new ConfirmationStore();

		// Assert
		expect(confirmation.pending).toBeNull();
	});

	it('publishes the question it is asking, for the sheet to render', () => {
		// Arrange
		const confirmation = new ConfirmationStore();

		// Act
		void confirmation.ask(request);

		// Assert
		expect(confirmation.pending).toEqual(request);
	});

	it('resolves to true and clears the question when confirmed', async () => {
		// Arrange
		const confirmation = new ConfirmationStore();
		const answer = confirmation.ask(request);

		// Act
		confirmation.confirm();

		// Assert
		await expect(answer).resolves.toBe(true);
		expect(confirmation.pending).toBeNull();
	});

	it('resolves to false and clears the question when dismissed', async () => {
		// Arrange
		const confirmation = new ConfirmationStore();
		const answer = confirmation.ask(request);

		// Act
		confirmation.dismiss();

		// Assert
		await expect(answer).resolves.toBe(false);
		expect(confirmation.pending).toBeNull();
	});

	it('declines a question still on screen when a second one is asked', async () => {
		// Arrange
		const confirmation = new ConfirmationStore();
		const first = confirmation.ask(request);

		// Act
		const second = confirmation.ask({ ...request, question: 'Reset this session?' });

		// Assert: nothing was agreed to, so the abandoned question answers no.
		await expect(first).resolves.toBe(false);
		expect(confirmation.pending?.question).toBe('Reset this session?');

		confirmation.confirm();
		await expect(second).resolves.toBe(true);
	});

	it('ignores an answer when nothing is being asked', async () => {
		// Arrange
		const confirmation = new ConfirmationStore();
		const answer = confirmation.ask(request);

		confirmation.confirm();

		// Act
		confirmation.dismiss();

		// Assert: the first answer stands rather than being overwritten by a stray second press.
		await expect(answer).resolves.toBe(true);
		expect(confirmation.pending).toBeNull();
	});
});
