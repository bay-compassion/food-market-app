import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';
import { SearchOpener } from '../queue/SearchOpener';
import { TicketOrderMenu } from '../queue/TicketOrderMenu';
import { SelectGuestsToggle } from './SelectGuestsToggle';

const Header = styled.header`
	display: grid;
	gap: 4px;
	justify-items: start;

	/* Back to the sessions, as a quiet link above what it leads back from. */
	.back {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 40px;
		/*
		 * Pulled up and in by the room the 40px tap target leaves around its text, so the text lines
		 * up with where every screen's content starts, under the dashboard's heading.
		 */
		margin-block: -8px -4px;
		margin-inline-start: -8px;
		padding: 0 10px;
		border: 0;
		border-radius: var(--radius-pill);
		color: var(--color-brand);
		background: transparent;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.back:hover {
		background: var(--color-surface-soft);
	}

	.title {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 8px 12px;
		align-self: stretch;
	}

	h2 {
		margin: 0;
		font-family: var(--font-heading);
		font-size: 22px;
	}

	p {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 14px;
	}

	/* Searching and ordering the guests, as the queue's toolbar does for the line. */
	.toolbar {
		display: flex;
		gap: 4px;
		align-items: center;
		align-self: stretch;
		margin-top: 8px;
	}
`;

/**
 * The top of an ended session's participants: the way back to the sessions, which session this
 * is, how many took part, and — once there is anyone — selecting several, searching, and sorting.
 */
export const SessionParticipantsHeader = observer(function SessionParticipantsHeader({
	when,
	onBack,
}: {
	/** The session's date and time, once the history has it. */
	when: string | null;
	onBack: () => void;
}) {
	const t = adminTranslations.en.participants;
	const { participants } = useRootStore().admin.sessionParticipants;
	const hasGuests = participants !== null && participants.count > 0;

	return (
		<Header>
			<button type="button" className="back" onClick={onBack}>
				<span aria-hidden="true">←</span>
				{t.back}
			</button>
			<div className="title">
				{when ? <h2>{when}</h2> : <span />}
				{hasGuests ? <SelectGuestsToggle /> : null}
			</div>
			<p>
				{participants ? `${t.count.replace('{count}', String(participants.count))} · ` : ''}
				{t.intro}
			</p>
			{hasGuests ? (
				<div className="toolbar">
					<SearchOpener label={t.openSearch} />
					<TicketOrderMenu />
				</div>
			) : null}
		</Header>
	);
});
