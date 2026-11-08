import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { useQueueDesk } from './queue-desk-context';
import { useCloseSession } from './use-close-session';

const size = { minHeight: 52, fontSize: 17, gap: 1.5 };

/** The number the button will call, as a chip on it, so the volunteer can say it before calling. */
const NextNumber = styled.span`
	min-width: 32px;
	padding: 2px 10px;
	border-radius: var(--radius-pill);
	color: var(--color-brand);
	background: var(--color-background);
	font-family: var(--font-heading);
	font-size: 17px;
	font-weight: 700;
	line-height: 1.4;
`;

/**
 * The one big button: calls the next guest, which opens their ticket and name tag straight away.
 * It carries the number at the front of the line. Once everyone is through, it gives its place to
 * closing the session.
 */
export const QueueCallButton = observer(function QueueCallButton() {
	const t = adminTranslations.en;
	const desk = useQueueDesk();
	const { roster, nextNumber } = desk;
	const closeSession = useCloseSession();

	if (roster.isComplete) {
		return (
			<Button
				type="button"
				variant="contained"
				color="error"
				fullWidth
				sx={size}
				disabled={desk.isBusy}
				onClick={() => void closeSession()}
			>
				{t.closeSession}
			</Button>
		);
	}

	return (
		<Button
			type="button"
			variant="contained"
			fullWidth
			sx={size}
			disabled={desk.isBusy || desk.isCalling || roster.waiting.length === 0}
			aria-label={
				nextNumber && !desk.isCalling
					? t.queueDesk.callNextNumber.replace('{number}', nextNumber.label)
					: undefined
			}
			onClick={() => void desk.callNext()}
		>
			{desk.isCalling ? (
				t.queueDesk.calling
			) : (
				<>
					{t.queueDesk.callNext}
					{nextNumber ? <NextNumber aria-hidden="true">{nextNumber.label}</NextNumber> : null}
				</>
			)}
		</Button>
	);
});
