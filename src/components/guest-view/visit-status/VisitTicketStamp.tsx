import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { useToday } from '../../hooks/use-today';

const blink = keyframes`
	0%, 100% { opacity: 1; }
	50% { opacity: 0.2; }
`;

const ripple = keyframes`
	0% { transform: scale(1); opacity: 0.45; }
	70%, 100% { transform: scale(2.4); opacity: 0; }
`;

const Stamp = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: center;
	gap: 4px 10px;
	margin: 0 auto 20px;
	padding: 8px 16px;
	border: 1.5px dashed color-mix(in srgb, var(--color-border) 60%, transparent);
	border-radius: var(--radius-md);
	color: var(--color-text);
	font-size: 15px;
	line-height: 1.3;

	strong {
		font-weight: 700;
	}
`;

const Live = styled.span`
	display: inline-flex;
	align-items: center;
	gap: 6px;
	color: var(--color-success);
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.06em;
	text-transform: uppercase;
`;

const LiveDot = styled.span`
	position: relative;
	width: 10px;
	height: 10px;
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
 * The guest's name and today's date with a slowly blinking "live" mark — what a check-in worker
 * reads, like a deli ticket, to tell that this screen belongs to the person holding it, is for
 * today's market, and is the running app rather than a screenshot of it.
 *
 * The date is formatted in the guest's language but always on the Gregorian calendar with Western
 * digits, so the day stays legible to a worker who does not read the guest's script.
 */
export const VisitTicketStamp = observer(function VisitTicketStamp() {
	const t = useTranslation();
	const { guest, translations } = useRootStore();
	const today = useToday();
	const date = new Intl.DateTimeFormat(translations.locale, {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		calendar: 'gregory',
		numberingSystem: 'latn',
	}).format(today);

	return (
		<Stamp className="visit-ticket-stamp">
			<Live>
				<LiveDot aria-hidden="true" />
				{t.guestView.visitStatus.ticket.liveLabel}
			</Live>
			{guest.displayedName ? <strong>{guest.displayedName}</strong> : null}
			<span>{date}</span>
		</Stamp>
	);
});
