import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { useRootStore } from '../../../stores/react/store-context';
import { useToday } from '../../hooks/use-today';

const blink = keyframes`
	0%, 100% { opacity: 1; }
	50% { opacity: 0.2; }
`;

const ripple = keyframes`
	0% { transform: scale(1); opacity: 0.45; }
	70%, 100% { transform: scale(2.4); opacity: 0; }
`;

/** mm/dd/yyyy on the Gregorian calendar with Western digits, independent of the guest's language. */
const ticketDateFormat = new Intl.DateTimeFormat('en-US', {
	month: '2-digit',
	day: '2-digit',
	year: 'numeric',
	calendar: 'gregory',
	numberingSystem: 'latn',
});

/* Sized to be read off a phone held up at arm's length: the name and date are the largest text on
   the card after the heading, in the condensed heading face so a long name still fits a line. */
const Stamp = styled.div`
	display: grid;
	grid-template-columns: auto auto;
	align-items: center;
	justify-content: center;
	column-gap: 14px;
	margin: 0 auto 20px;
	padding: 12px 22px;
	border: 2px dashed color-mix(in srgb, var(--color-border) 60%, transparent);
	border-radius: var(--radius-md);
	color: var(--color-text);
	font-family: var(--font-heading);
	font-weight: 700;
	line-height: 1.15;
	text-align: start;
`;

const Details = styled.div`
	display: flex;
	flex-direction: column;
	min-width: 0;
`;

const Name = styled.strong`
	font-size: 30px;
	overflow-wrap: anywhere;
`;

const TicketDate = styled.span`
	font-size: 26px;
	font-variant-numeric: tabular-nums;
	letter-spacing: 0.02em;
`;

const LiveDot = styled.span`
	position: relative;
	width: 16px;
	height: 16px;
	border-radius: var(--radius-pill);
	background: var(--color-success);
	animation: ${blink} 2s ease-in-out infinite;

	&::after {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: inherit;
		animation: ${ripple} 2s ease-out infinite;
		content: '';
	}

	/* The blink is what tells a live screen from a screenshot, so it stays; only the expanding ring,
	   which is movement rather than a change of brightness, goes. */
	@media (prefers-reduced-motion: reduce) {
		&::after {
			animation: none;
			opacity: 0;
		}
	}
`;

/**
 * The guest's name and today's date beside a slowly blinking dot — what a check-in worker reads,
 * like a deli ticket, to tell that this screen belongs to the person holding it, is for today's
 * market, and is the running app rather than a screenshot of it.
 *
 * The date is always mm/dd/yyyy, whatever the guest's language: it is there for staff to check, not
 * for the guest to read.
 */
export const VisitTicketStamp = observer(function VisitTicketStamp() {
	const { guest } = useRootStore();
	const today = useToday();

	return (
		// Left-to-right in every language: staff read it in English, and it should look the same on
		// every guest's phone.
		<Stamp className="visit-ticket-stamp" dir="ltr">
			<LiveDot aria-hidden="true" />
			<Details>
				{guest.displayedName ? <Name>{guest.displayedName}</Name> : null}
				<TicketDate>{ticketDateFormat.format(today)}</TicketDate>
			</Details>
		</Stamp>
	);
});
