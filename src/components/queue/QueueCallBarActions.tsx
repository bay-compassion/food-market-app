import { MenuItem } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { OverflowMenu } from '../admin/OverflowMenu';
import { useQueueDesk } from './queue-desk-context';
import { QueueCallButton } from './QueueCallButton';

/**
 * The phone's bottom edge: the one big button, and the less frequent ways to act on the line beside
 * it. They stay a tap apart from calling a guest, so a slip of the thumb can't add one by mistake.
 */
export const QueueCallBarActions = observer(function QueueCallBarActions() {
	const t = adminTranslations.en;
	const desk = useQueueDesk();

	return (
		<div className="call-actions">
			<QueueCallButton />
			{desk.canAddGuest ? (
				<OverflowMenu label={t.queueDesk.lineActions} disabled={desk.isBusy} opensUpward>
					{(closeMenu) => (
						<MenuItem
							onClick={() => {
								closeMenu();
								desk.openAddGuest();
							}}
						>
							{t.queueDesk.addGuest}
						</MenuItem>
					)}
				</OverflowMenu>
			) : null}
		</div>
	);
});
