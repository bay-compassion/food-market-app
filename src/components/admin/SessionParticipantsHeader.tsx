import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';
import { SearchOpener } from '../queue/SearchOpener';
import { TicketOrderMenu } from '../queue/TicketOrderMenu';
import { BackButton } from './BackButton';
import { SelectGuestsToggle } from './SelectGuestsToggle';

const Header = styled.header`
	display: grid;
	gap: 4px;
	justify-items: start;

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
			<BackButton label={t.back} onClick={onBack} />
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
