import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import { CalledVisitStatus } from './visit-status/CalledVisitStatus';
import { CompletedVisitStatus } from './visit-status/CompletedVisitStatus';
import { RegisteredVisitStatus } from './visit-status/RegisteredVisitStatus';
import { WaitingVisitStatus } from './visit-status/WaitingVisitStatus';

export type GuestVisitStatusProps = {
	onCancelVisit: () => void;
};

const SubmissionError = styled.p`
	margin: 0;
	color: var(--color-error);
	font-size: 13px;
	line-height: 1.4;
`;

/** Chooses the focused presentation for the guest's current visit state. */
export const GuestVisitStatus = observer(function GuestVisitStatus({
	onCancelVisit,
}: GuestVisitStatusProps) {
	const t = useTranslation();
	const { visit } = useRootStore();
	const status = visit.currentVisit?.status;
	const copy = t.guestView.visitStatus;

	if (!status) {
		return null;
	}

	const footer = (
		<>
			{visit.cancelError ? (
				<SubmissionError className="submission-error" role="alert">
					{copy.updateError}
				</SubmissionError>
			) : null}
			{visit.canCancel ? (
				<Button
					type="button"
					variant="outlined"
					disabled={visit.isCancelling}
					onClick={onCancelVisit}
				>
					{copy.cancelAction}
				</Button>
			) : null}
		</>
	);

	switch (status) {
		case 'registered':
			return <RegisteredVisitStatus copy={copy} footer={footer} />;
		case 'waiting':
			return (
				<WaitingVisitStatus
					copy={copy}
					queuePosition={visit.queuePosition}
					guestsAhead={visit.guestsAhead}
					footer={footer}
				/>
			);
		case 'called':
			return <CalledVisitStatus copy={copy.called} />;
		case 'served':
		case 'not_placed':
		case 'no_show':
		case 'cancelled':
			return <CompletedVisitStatus heading={copy.labels[status]} />;
	}
});
