import styled from '@emotion/styled';
import { MenuItem } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router';

import { adminTranslations } from '../../adminLocales';
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

	.status::before {
		content: '';
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: currentColor;
	}
`;

/** The top of the queue screen: what it is, that service is running, and the rarer actions. */
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
			<OverflowMenu label={t.queueDesk.actions} disabled={desk.isBusy}>
				{(closeMenu) => (
					<>
						<MenuItem component={Link} to="/admin" onClick={closeMenu}>
							{t.queueDesk.openDashboard}
						</MenuItem>
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
		</Header>
	);
});
