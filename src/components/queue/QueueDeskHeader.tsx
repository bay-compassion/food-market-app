import styled from '@emotion/styled';
import { IconButton, MenuItem } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router';

import { adminTranslations } from '../../adminLocales';
import { KioskUnlockMenuItem } from '../admin/KioskUnlockMenuItem';
import { OverflowMenu } from '../admin/OverflowMenu';
import { useQueueDesk } from './queue-desk-context';
import { useCloseSession } from './use-close-session';

const Header = styled.header`
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 12px;
	padding: 4px 4px 0 6px;

	h1 {
		margin: 0;
		font-family: var(--font-heading);
		font-size: 24px;
		font-weight: 700;
	}

	.status {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 0;
		color: var(--color-success);
		font-size: 13px;
		font-weight: 700;
	}

	.actions {
		display: flex;
		gap: 4px;
		align-items: center;
	}

	.status::before {
		content: '';
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: currentColor;
	}
`;

function SearchIcon() {
	return (
		<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none">
			<circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
			<path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
		</svg>
	);
}

/**
 * The top of the queue screen: what it is, that service is running, searching the line, and the
 * rarer actions.
 */
export const QueueDeskHeader = observer(function QueueDeskHeader() {
	const t = adminTranslations.en;
	const desk = useQueueDesk();
	const closeSession = useCloseSession();

	return (
		<Header>
			<div>
				<h1>{t.queueDesk.title}</h1>
				<p className="status">{t.queueDesk.serving}</p>
			</div>
			<div className="actions">
				<IconButton
					aria-label={t.queueDesk.openSearch}
					aria-keyshortcuts="/"
					aria-haspopup="dialog"
					onClick={() => desk.openSearch()}
				>
					<SearchIcon />
				</IconButton>
				<OverflowMenu label={t.queueDesk.actions} disabled={desk.isBusy}>
					{(closeMenu) => (
						<>
							<MenuItem component={Link} to="/admin" onClick={closeMenu}>
								{t.queueDesk.openDashboard}
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
			</div>
		</Header>
	);
});
