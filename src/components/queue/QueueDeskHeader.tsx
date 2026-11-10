import styled from '@emotion/styled';
import { IconButton } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { useQueueDesk } from './queue-desk-context';
import { QueueActionsMenu } from './QueueActionsMenu';
import { SearchIcon } from './SearchIcon';

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

/**
 * The top of the queue screen: what it is, that service is running, searching the line, and the
 * rarer actions.
 */
export const QueueDeskHeader = observer(function QueueDeskHeader() {
	const t = adminTranslations.en;
	const desk = useQueueDesk();

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
				<QueueActionsMenu />
			</div>
		</Header>
	);
});
