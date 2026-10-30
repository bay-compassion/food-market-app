import styled from '@emotion/styled';
import Button from '@mui/material/Button';
import { observer } from 'mobx-react-lite';

import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import { GuestGuideButton } from '../GuestGuideButton';
import { useToday } from '../hooks/use-today';
import { EventIcon } from '../ui/icons/EventIcon';
import { StorefrontIcon } from '../ui/icons/StorefrontIcon';

/** The answer a returning guest looks for first: when registration opens again. */
const Panel = styled.section`
	display: grid;
	gap: 10px;
	justify-items: start;
	padding: 20px;
	border-radius: 16px;
	background: var(--color-surface-soft);

	h2 {
		margin: 0;
		color: var(--color-text-muted);
		font-family: var(--font-heading);
		font-size: 15px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
`;

const Masthead = styled.div`
	display: flex;
	align-items: center;
	gap: 12px;
`;

const Symbol = styled.span`
	display: grid;
	width: 40px;
	height: 40px;
	flex-shrink: 0;
	place-items: center;
	border-radius: 50%;
	color: var(--color-on-brand);
	background: var(--color-brand);
`;

/** Full width and stacked, so the two buttons line up whatever their labels' lengths. */
const Actions = styled.div`
	display: grid;
	gap: 8px;
	justify-self: stretch;
	margin-top: 4px;
`;

const Upcoming = styled.div`
	display: grid;
	gap: 2px;
`;

const Label = styled.p`
	color: var(--color-text-muted);
	font-weight: 500;
`;

const Day = styled.p`
	color: var(--color-brand-dark);
	font-family: var(--font-heading);
	font-size: 30px;
	font-weight: 700;
	line-height: 1.1;
`;

const Opens = styled.p`
	color: var(--color-text);
	font-size: 17px;
	line-height: 1.4;
`;

/** The market is closed, when registration opens again, and the calendar and guide buttons. */
export const GuestNextOpening = observer(function GuestNextOpening() {
	const { session, translations } = useRootStore();
	const copy = useTranslation().guestView.notOpenState;
	const today = useToday();
	const { day, opens } = session.nextRegistration.headline(
		{
			undatedDay: copy.scheduleHeading,
			opensDated: copy.opensDated,
			opensUndated: copy.opensUndated,
		},
		translations.locale,
		today,
	);
	const invite = session.nextRegistration.invite(copy.calendarEventTitle, window.location.origin);

	return (
		<Panel>
			<Masthead>
				<Symbol aria-hidden="true">
					<StorefrontIcon />
				</Symbol>
				<h2>{copy.heading}</h2>
			</Masthead>
			<Upcoming>
				<Label>{copy.nextLabel}</Label>
				<Day>{day}</Day>
				<Opens>{opens}</Opens>
			</Upcoming>
			<Actions>
				{invite ? (
					<Button
						component="a"
						href={invite.dataUri}
						download={invite.fileName}
						variant="outlined"
						startIcon={<EventIcon />}
					>
						{copy.addToCalendar}
					</Button>
				) : null}
				<GuestGuideButton compact />
			</Actions>
		</Panel>
	);
});
