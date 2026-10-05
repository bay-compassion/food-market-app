import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { NameTag } from '../../models/name-tag';
import type { QueueGuest } from '../../services/admin-api';
import { useQueueDesk } from './queue-desk-context';

export type TicketChipProps = {
	guest: QueueGuest;
	/** The shared clock the chips count from, so a list of them ticks over together. */
	now: number;
};

const Row = styled.li`
	list-style: none;

	button {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		width: 100%;
		min-height: 52px;
		padding: 6px 12px 6px 6px;
		border: 0;
		border-radius: var(--radius-md);
		color: var(--color-text-subtle);
		background: transparent;
		font-size: 14px;
		text-align: start;
	}

	button:active,
	button[aria-current='true'] {
		background: var(--color-border);
	}

	.number {
		flex: none;
		min-width: 64px;
		padding: 8px 14px;
		border-radius: var(--radius-pill);
		color: var(--color-brand);
		background: var(--color-background);
		font-family: var(--font-heading);
		font-size: 18px;
		font-weight: 700;
		text-align: center;
	}

	&[data-status='called'] .number {
		color: var(--color-on-brand);
		background: var(--color-success);
	}

	&[data-status='served'] .number {
		color: var(--color-success);
	}

	/* Red, not struck through: a no-show can still be returned to the line. */
	&[data-status='no_show'] .number {
		color: var(--color-on-brand);
		background: var(--color-error);
	}

	&[data-status='not_placed'] .number {
		color: var(--color-text-subtle);
	}

	&[data-status='cancelled'] .number {
		color: var(--color-text-subtle);
		text-decoration: line-through;
	}

	.name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		color: var(--color-text);
		font-size: 16px;
		font-weight: 600;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.language {
		flex: none;
		padding: 2px 8px;
		border-radius: var(--radius-pill);
		color: var(--color-text-muted);
		background: var(--color-background);
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.06em;
	}

	.elapsed {
		flex: none;
		min-width: 4ch;
		font-variant-numeric: tabular-nums;
		text-align: end;
	}
`;

/**
 * One ticket in a list: its number, who it is, the language to greet them in, how long since they
 * were called, and a tap to open it.
 */
export const TicketChip = observer(function TicketChip({ guest, now }: TicketChipProps) {
	const t = adminTranslations.en.queueDesk;
	const desk = useQueueDesk();
	const number = guest.queuePosition === null ? '—' : String(guest.queuePosition);
	const name = `${guest.firstName} ${guest.lastName}`.trim();
	const minutes =
		guest.status === 'called' && guest.calledAt
			? Math.max(0, Math.floor((now - new Date(guest.calledAt).valueOf()) / 60_000))
			: null;

	return (
		<Row data-status={guest.status}>
			<button
				type="button"
				aria-label={t.openTicket.replace('{number}', number).replace('{name}', name)}
				aria-current={desk.selected?.id === guest.id}
				onClick={() => desk.select(guest)}
			>
				<span className="number">{number}</span>
				<span className="name">{name}</span>
				<span className="language">{new NameTag(guest).languageCode}</span>
				{/* Always drawn, empty when untimed, so the language codes line up down the list. */}
				<span className="elapsed">
					{minutes === null
						? null
						: minutes === 0
							? t.elapsedJustNow
							: t.elapsedMinutes.replace('{minutes}', String(minutes))}
				</span>
			</button>
		</Row>
	);
});
