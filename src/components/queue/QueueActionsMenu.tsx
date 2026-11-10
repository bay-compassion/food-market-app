import { MenuItem } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router';

import { adminTranslations } from '../../adminLocales';
import { KioskUnlockMenuItem } from '../admin/KioskUnlockMenuItem';
import { OverflowMenu } from '../admin/OverflowMenu';
import { useQueueDesk } from './queue-desk-context';
import { useCloseSession } from './use-close-session';

export type QueueActionsMenuProps = {
	/**
	 * Inside the dashboard's Queue tab, the way out leads to the standalone `/queue` screen;
	 * on that screen, back to the dashboard.
	 */
	embedded?: boolean;
};

/**
 * The line's rarer actions, behind one button: switching between the dashboard and the standalone
 * screen, unlocking a room display, and closing the session.
 */
export const QueueActionsMenu = observer(function QueueActionsMenu({
	embedded,
}: QueueActionsMenuProps) {
	const t = adminTranslations.en;
	const desk = useQueueDesk();
	const closeSession = useCloseSession();

	return (
		<OverflowMenu label={t.queueDesk.actions} disabled={desk.isBusy}>
			{(closeMenu) => (
				<>
					<MenuItem component={Link} to={embedded ? '/queue' : '/admin'} onClick={closeMenu}>
						{embedded ? t.queueDesk.openQueueDesk : t.queueDesk.openDashboard}
					</MenuItem>
					<KioskUnlockMenuItem closeMenu={closeMenu} />
					<MenuItem
						sx={{ color: 'error.main', fontWeight: 700 }}
						onClick={() => {
							closeMenu();
							void closeSession();
						}}
					>
						{t.closeSession}
					</MenuItem>
				</>
			)}
		</OverflowMenu>
	);
});
