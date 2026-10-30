import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { useToday } from '../../hooks/use-today';
import { AddToCalendarButton } from './AddToCalendarButton';
import { StatusFact } from './StatusFact';

/**
 * A card of its own under today's news, so the next date reads as what comes after it. Next time is
 * the market's news, not the status card's: brand-coloured whatever that card's tone.
 */
const Card = styled.section`
	--status-strong: var(--color-brand-dark);

	display: grid;
	gap: 12px;
	padding: 14px 20px 20px;
	border-radius: var(--radius-md);
	background: var(--color-surface-soft);
`;

export type NextRegistrationDetailsProps = {
	/**
	 * `lead` when the next registration is the status card's whole message (the market is closed);
	 * `card` when it follows today's news, as a card of its own with the calendar button.
	 */
	variant: 'lead' | 'card';
};

/** When registration next opens: the date, and how soon. */
export const NextRegistrationDetails = observer(function NextRegistrationDetails({
	variant,
}: NextRegistrationDetailsProps) {
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
	const fact = (
		<StatusFact label={copy.nextLabel} value={day} note={opens} compact={variant === 'card'} />
	);

	if (variant === 'lead') {
		return fact;
	}

	return (
		<Card className="next-registration-card">
			{fact}
			<AddToCalendarButton />
		</Card>
	);
});
