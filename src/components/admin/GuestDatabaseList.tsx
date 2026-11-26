import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import type { GuestDatabaseRow } from '../../models/guest-database-rows';
import type { VisitCommand } from '../../services/visitStateMachine';
import { QueueGuestActions } from './QueueGuestActions';
import type { QueueGuest } from './types';

const List = styled.ul`
	display: grid;
	margin: 0;
	padding: 0;
	list-style: none;

	li {
		display: flex;
		min-height: 64px;
		align-items: center;
		gap: 12px;
		padding: 8px 0;
		border-top: 1px solid var(--color-divider);
	}

	/* The row's who and when, as one button that opens the guest's profile. */
	.guest-open {
		display: flex;
		flex: 1;
		align-items: center;
		gap: 12px;
		min-width: 0;
		min-height: 48px;
		padding: 0;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: start;
		cursor: pointer;
	}

	.guest-text {
		display: grid;
		flex: 1;
		gap: 2px;
		min-width: 0;
	}

	.guest-text strong {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.guest-text span {
		color: var(--color-text-subtle);
		font-size: 14px;
	}

	.guest-name {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
	}

	.guest-flag {
		flex-shrink: 0;
		padding: 1px 7px;
		border-radius: var(--radius-pill);
		background: var(--color-warning-surface);
		color: var(--color-warning);
		font-size: 11px;
		font-weight: 700;
	}

	.guest-visits {
		display: grid;
		flex-shrink: 0;
		justify-items: end;
		gap: 3px;
	}

	.guest-visits .last-visit {
		color: var(--color-text-muted);
		font-size: 13px;
		font-weight: 500;
	}

	.guest-visits .visit-count {
		color: var(--color-text-subtle);
		font-size: 12px;
	}

	.guest-status {
		padding: 3px 10px;
		border-radius: var(--radius-pill);
		background: var(--color-surface-soft);
		color: var(--color-brand-dark);
		font-size: 12px;
		font-weight: 700;
	}
`;

export type GuestDatabaseListProps = {
	rows: GuestDatabaseRow[];
	busy?: boolean;
	onRun: (guest: QueueGuest, command: VisitCommand) => void;
	onOpenGuest: (guestId: string) => void;
};

/**
 * The guest database on a phone, one row per guest: a grid shows a column and a half at this
 * width, so the same rows become a list of who, how to reach them, and when they last came — or,
 * for a guest in today's session, where that visit stands. A guest with notes is flagged with the
 * newest note's category. Each row's menu is the grid's own actions menu.
 */
export const GuestDatabaseList = observer(function GuestDatabaseList({
	rows,
	busy,
	onRun,
	onOpenGuest,
}: GuestDatabaseListProps) {
	const t = adminTranslations.en;

	if (!rows.length) {
		return <p className="empty-state">{t.noGuests}</p>;
	}

	return (
		<List className="guest-database-list" aria-label={t.allGuests}>
			{rows.map((row) => (
				<li key={row.id}>
					<button type="button" className="guest-open" onClick={() => onOpenGuest(row.id)}>
						<span className="guest-text">
							<span className="guest-name">
								<strong>{row.name}</strong>
								{noteFlag(row) ? <span className="guest-flag">{noteFlag(row)}</span> : null}
							</span>
							<span>
								{[
									row.phone,
									row.householdSize === null ? null : `${t.householdColumn} ${row.householdSize}`,
									row.language,
								]
									.filter(Boolean)
									.join(' · ')}
							</span>
						</span>
						<span className="guest-visits">
							{row.inSession ? (
								<span className="guest-status">{row.statusLabel}</span>
							) : (
								<span className="last-visit">{row.lastVisitLabel}</span>
							)}
							{row.visitCount > 0 ? (
								<span className="visit-count">
									{row.visitCount === 1
										? t.visitCountOne
										: t.visitCount.replace('{count}', String(row.visitCount))}
								</span>
							) : null}
						</span>
					</button>
					<QueueGuestActions
						guest={row.guest}
						disabled={busy}
						menuOnly
						offerDeletion
						// A guest with no visit is offered no command, so this only ever runs against a visit.
						onRun={(command) => row.guest.status !== null && onRun(row.guest, command)}
					/>
				</li>
			))}
		</List>
	);
});

/** What flags a guest with notes: their newest note's category, or how many notes they have. */
function noteFlag({ noteCount, latestNoteCategory }: GuestDatabaseRow): string | null {
	const t = adminTranslations.en;

	if (noteCount === 0) {
		return null;
	}

	return (
		latestNoteCategory ??
		(noteCount === 1 ? t.noteCountOne : t.noteCount.replace('{count}', String(noteCount)))
	);
}
