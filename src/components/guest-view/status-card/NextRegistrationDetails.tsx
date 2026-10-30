import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { useToday } from '../../hooks/use-today';
import { AddToCalendarButton } from './AddToCalendarButton';
import { StatusFact } from './StatusFact';

/** A box of its own inside the card, so the next date reads as what comes after today's news. */
const Inset = styled.div`
	/* Next time is the market's news, not the card's: brand-coloured whatever the card's tone. */
	--status-strong: var(--color-brand-dark);

	display: grid;
	gap: 12px;
	justify-self: stretch;
	padding: 16px;
	border-radius: 12px;
	background: var(--color-background);
`;

export type NextRegistrationDetailsProps = {
	/**
	 * `lead` when the next registration is the card's whole message (the market is closed); `inset`
	 * when it follows today's news, set in its own box with the calendar button.
	 */
	variant: 'lead' | 'inset';
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
		<StatusFact label={copy.nextLabel} value={day} note={opens} compact={variant === 'inset'} />
	);

	if (variant === 'lead') {
		return fact;
	}

	return (
		<Inset>
			{fact}
			<AddToCalendarButton />
		</Inset>
	);
});
