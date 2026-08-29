import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { useTranslation } from '../../stores/react/use-translation';

const Details = styled.div`
	display: grid;
	max-width: 360px;
	gap: 8px;
	margin: 0 auto 8px;
`;

const Heading = styled.p`
	color: var(--color-brand);
	font-weight: 700;
	line-height: 1.4;
`;

const Body = styled.p`
	color: var(--color-text-muted);
	line-height: 1.55;
`;

/** When the market next opens, shown inside the states where that is the useful next step. */
export const GuestScheduleDetails = observer(function GuestScheduleDetails() {
	const t = useTranslation();

	return (
		<Details className="schedule-details">
			<Heading className="schedule-heading">{t.guestView.scheduleInformation.heading}</Heading>
			<Body className="schedule-body">{t.guestView.scheduleInformation.body}</Body>
		</Details>
	);
});
