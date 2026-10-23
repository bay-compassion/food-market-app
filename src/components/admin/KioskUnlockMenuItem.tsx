import { MenuItem } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';

/** The overflow-menu item that opens `KioskUnlockDialog`, on the queue screen and the dashboard. */
export const KioskUnlockMenuItem = observer(function KioskUnlockMenuItem({
	closeMenu,
}: {
	closeMenu: () => void;
}) {
	const { admin } = useRootStore();

	return (
		<MenuItem
			onClick={() => {
				closeMenu();
				void admin.showKioskUnlockCode();
			}}
		>
			{adminTranslations.en.kioskUnlock.open}
		</MenuItem>
	);
});
