import { describe, expect, it } from 'vitest';

import { GuestNotePolicy, GuestNotes, type GuestNoteRecord } from './guest-note';

const openSession = 'session-open';

function note(overrides: Partial<GuestNoteRecord> = {}): GuestNoteRecord {
	return {
		id: 'note-1',
		guestId: 'guest-1',
		marketEventId: openSession,
		kind: 'text',
		body: 'Uses a cane.',
		categoryId: null,
		categoryLabel: null,
		authorId: 'auth0|volunteer',
		authorName: 'Lee',
		createdAt: '2026-11-26T17:00:00.000Z',
		updatedAt: '2026-11-26T17:00:00.000Z',
		editable: false,
		...overrides,
	};
}

describe('GuestNotePolicy', () => {
	const volunteer = { id: 'auth0|volunteer', permissions: ['run:queue' as const] };

	it('lets an author change their own note while its session is open', () => {
		// Arrange
		const policy = new GuestNotePolicy(volunteer, openSession);

		// Act
		const allowed = policy.canModify(note());

		// Assert
		expect(allowed).toBe(true);
	});

	it.each([
		['another worker’s note', note({ authorId: 'auth0|someone-else' })],
		['a note from an ended session', note({ marketEventId: 'session-ended' })],
		['a note carried over with no session', note({ marketEventId: null, authorId: null })],
	])('refuses a volunteer %s', (_, target) => {
		// Arrange
		const policy = new GuestNotePolicy(volunteer, openSession);

		// Act
		const allowed = policy.canModify(target);

		// Assert
		expect(allowed).toBe(false);
	});

	it('refuses an author once no session is open', () => {
		// Arrange
		const policy = new GuestNotePolicy(volunteer, null);

		// Act
		const allowed = policy.canModify(note());

		// Assert
		expect(allowed).toBe(false);
	});

	it('refuses a worker with no Auth0 subject, even against a note with none', () => {
		// Arrange
		const policy = new GuestNotePolicy({ id: null, permissions: ['run:queue'] }, openSession);

		// Act
		const allowed = policy.canModify(note({ authorId: null }));

		// Assert
		expect(allowed).toBe(false);
	});

	it('lets a holder of manage:guest-notes change any note', () => {
		// Arrange
		const policy = new GuestNotePolicy(
			{ id: 'auth0|lead', permissions: ['run:queue', 'manage:guest-notes'] },
			null,
		);

		// Act
		const allowed = policy.canModify(note({ marketEventId: null, authorId: null }));

		// Assert
		expect(allowed).toBe(true);
	});
});

describe('GuestNotes', () => {
	it('lists newest first and counts screenshot notices', () => {
		// Arrange
		const notes = new GuestNotes([
			note({ id: 'a', createdAt: '2026-11-01T17:00:00.000Z', kind: 'screenshot_notice' }),
			note({ id: 'b', createdAt: '2026-11-26T17:00:00.000Z', editable: true }),
			note({ id: 'c', createdAt: '2026-11-12T17:00:00.000Z', kind: 'screenshot_notice' }),
		]);

		// Act
		const order = notes.newestFirst.map(({ id }) => id);

		// Assert
		expect(order).toEqual(['b', 'c', 'a']);
		expect(notes.screenshotNoticeCount).toBe(2);
		expect(notes.hasLockedNotes).toBe(true);
		expect(notes.isEmpty).toBe(false);
	});

	describe('categories', () => {
		const notes = new GuestNotes([
			note({ id: 'a', createdAt: '2026-10-22T17:00:00.000Z', categoryLabel: 'Accessibility' }),
			note({ id: 'b', createdAt: '2026-11-19T17:00:00.000Z', categoryLabel: 'Escalate to Lead' }),
			note({ id: 'c', createdAt: '2026-11-01T17:00:00.000Z', categoryLabel: null }),
			note({ id: 'd', createdAt: '2026-09-01T17:00:00.000Z', categoryLabel: 'Accessibility' }),
		]);

		it('names each category with its count, newest first', () => {
			// Arrange, Act
			const categories = notes.categories;

			// Assert
			expect(categories).toEqual([
				{ label: 'Escalate to Lead', count: 1 },
				{ label: 'Accessibility', count: 2 },
			]);
		});

		it('files notes under a category, and every note under none', () => {
			// Arrange, Act
			const accessibility = notes.filedUnder('Accessibility').map(({ id }) => id);
			const all = notes.filedUnder(null).map(({ id }) => id);

			// Assert
			expect(accessibility).toEqual(['a', 'd']);
			expect(all).toEqual(['b', 'c', 'a', 'd']);
		});

		it('reads the newest note, and none without notes', () => {
			// Arrange, Act, Assert
			expect(notes.latest?.id).toBe('b');
			expect(new GuestNotes([]).latest).toBeNull();
		});
	});
});
