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
		border-top: 1px solid #e2e6e3;
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

	.guest-status {
		flex-shrink: 0;
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
};

/**
 * The guest database on a phone, one row per guest: a grid shows a column and a half at this
 * width, so the same rows become a list of who, how to reach them, and where today's visit stands.
 * Each row's menu is the grid's own actions menu.
 */
export const GuestDatabaseList = observer(function GuestDatabaseList({
	rows,
	busy,
	onRun,
}: GuestDatabaseListProps) {
	const t = adminTranslations.en;

	if (!rows.length) {
		return <p className="empty-state">{t.noGuests}</p>;
	}

	return (
		<List className="guest-database-list" aria-label={t.allGuests}>
			{rows.map(({ id, guest, name, phone, householdSize, language, status, statusLabel }) => (
				<li key={id}>
					<span className="guest-text">
						<strong>{name}</strong>
						<span>
							{[
								phone,
								householdSize === null ? null : `${t.householdColumn} ${householdSize}`,
								language,
							]
								.filter(Boolean)
								.join(' · ')}
						</span>
					</span>
					{status === null ? null : <span className="guest-status">{statusLabel}</span>}
					<QueueGuestActions
						guest={guest}
						disabled={busy}
						menuOnly
						// A guest with no visit is offered no command, so this only ever runs against a visit.
						onRun={(command) => guest.status !== null && onRun(guest, command)}
					/>
				</li>
			))}
		</List>
	);
});
