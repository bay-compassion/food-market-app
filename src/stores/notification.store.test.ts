import { describe, expect, it } from 'vitest';

import { NotificationStore } from './notification.store';

describe('NotificationStore', () => {
	it('has nothing pending until something is raised', () => {
		// Arrange / Act
		const notifications = new NotificationStore();

		// Assert
		expect(notifications.pending).toEqual([]);
	});

	it('queues messages oldest first, each with its own id and severity', () => {
		// Arrange
		const notifications = new NotificationStore();

		// Act
		notifications.error('Could not save.');
		notifications.success('Saved.');
		notifications.notify('Heads up.');

		// Assert
		expect(notifications.pending).toEqual([
			{ id: 1, message: 'Could not save.', severity: 'error' },
			{ id: 2, message: 'Saved.', severity: 'success' },
			{ id: 3, message: 'Heads up.', severity: 'info' },
		]);
	});

	it('hands over everything pending when taken, leaving nothing behind', () => {
		// Arrange
		const notifications = new NotificationStore();

		notifications.error('Could not save.');

		// Act
		const taken = notifications.take();

		// Assert
		expect(taken).toEqual([{ id: 1, message: 'Could not save.', severity: 'error' }]);
		expect(notifications.pending).toEqual([]);
	});
});
