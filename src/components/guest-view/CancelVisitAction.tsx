import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';

const Wrapper = styled.div`
	margin-top: 16px;
`;

const SubmissionError = styled.p`
	margin: 0 0 10px;
	color: var(--color-error);
	font-size: 13px;
	line-height: 1.4;
	text-align: center;
`;

/**
 * The destructive cancel action for the guest's current visit. Kept outside the status card so
 * it reads as a standalone, deliberate action rather than part of the status the card reports.
 */
export const CancelVisitAction = observer(function CancelVisitAction() {
	const t = useTranslation();
	const { visit } = useRootStore();
	const copy = t.guestView.visitStatus;

	if (!visit.canCancel) {
		return null;
	}

	function handleCancel() {
		if (window.confirm(copy.cancelConfirmation)) {
			void visit.cancel();
		}
	}

	return (
		<Wrapper>
			{visit.cancelError ? (
				<SubmissionError className="submission-error" role="alert">
					{copy.updateError}
				</SubmissionError>
			) : null}
			<Button
				type="button"
				variant="outlined"
				color="error"
				fullWidth
				disabled={visit.isCancelling}
				onClick={handleCancel}
			>
				{copy.cancelAction}
			</Button>
		</Wrapper>
	);
});
