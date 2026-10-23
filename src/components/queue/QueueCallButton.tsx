import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { useQueueDesk } from './queue-desk-context';
import { useCloseSession } from './use-close-session';

const size = { minHeight: 52, fontSize: 17 };

/**
 * The one big button: calls the next guest, which opens their ticket and name tag straight away.
 * Once everyone is through, it gives its place to closing the session.
 */
export const QueueCallButton = observer(function QueueCallButton() {
	const t = adminTranslations.en;
	const desk = useQueueDesk();
	const { roster } = desk;
	const closeSession = useCloseSession();

	return roster.isComplete ? (
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
	) : (
		<Button
			type="button"
			variant="contained"
			fullWidth
			sx={size}
			disabled={desk.isBusy || roster.waiting.length === 0}
			onClick={() => void desk.callNext()}
		>
			{t.queueDesk.callNext}
		</Button>
	);
});
