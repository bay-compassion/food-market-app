import { describe, expect, it } from 'vitest';

import { viewsFor } from '../services/admin-views';
import { AdminNavigation } from './admin-navigation';

describe('AdminNavigation', () => {
	it('sorts an administrator’s screens under their headings, with Dev Mode trailing', () => {
		// Arrange
		const navigation = new AdminNavigation(
			viewsFor(['manage:sessions', 'run:queue', 'read:reports', 'manage:demo-data']),
		);

		// Act
		const sections = navigation.sections;

		// Assert
		expect(sections).toEqual([
			{ group: 'today', views: ['checklist', 'current-session', 'queue', 'broadcast'] },
			{ group: 'plan', views: ['schedule', 'question-bank'] },
			{ group: 'records', views: ['guest-database', 'session-history', 'reports'] },
			{ group: null, views: ['dev-mode'] },
		]);
		expect(navigation.showsHeadings).toBe(true);
	});

	it('lists a queue worker’s three screens without headings', () => {
		// Arrange
		const navigation = new AdminNavigation(viewsFor(['run:queue']));

		// Act
		const showsHeadings = navigation.showsHeadings;

		// Assert
		expect(navigation.sections.flatMap((section) => section.views)).toEqual([
			'queue',
			'guest-database',
			'session-history',
		]);
		expect(showsHeadings).toBe(false);
	});

	it('leaves out headings when every screen falls under one', () => {
		// Arrange
		const navigation = new AdminNavigation(['current-session', 'queue', 'broadcast', 'dev-mode']);

		// Act
		const showsHeadings = navigation.showsHeadings;

		// Assert
		expect(showsHeadings).toBe(false);
	});

	it('marks only the screens the worker can open as current', () => {
		// Arrange
		const navigation = new AdminNavigation(viewsFor(['run:queue']));

		// Act
		const canMarkReports = navigation.includes('reports');

		// Assert
		expect(navigation.includes('queue')).toBe(true);
		expect(canMarkReports).toBe(false);
	});

	it('is empty for a role that opens nothing', () => {
		// Arrange
		const navigation = new AdminNavigation([]);

		// Act
		const sections = navigation.sections;

		// Assert
		expect(navigation.isEmpty).toBe(true);
		expect(sections).toEqual([]);
	});
});
