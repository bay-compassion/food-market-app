import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';

import { adminTranslations } from '../../adminLocales';
import { PageVisibilityPoller } from '../../services/page-visibility-poller';
import { useRootStore } from '../../stores/react/store-context';
import { ChecklistPhase } from './ChecklistPhase';
import { ChecklistTaskList } from './ChecklistTaskList';

/** How often the card looks again at whether the station is checking in. */
const checkIntervalMs = 15_000;

const Status = styled.span`
	flex: none;
	padding: 3px 10px;
	border-radius: var(--radius-pill);
	font-size: 13px;
	font-weight: 700;
	white-space: nowrap;

	&[data-online='true'] {
		color: var(--color-success);
		background: var(--color-success-surface);
	}

	&[data-online='false'] {
		color: var(--color-error);
		background: var(--color-surface-soft);
	}
`;

const Account = styled.p`
	margin: 0;
	padding: 10px 12px;
	border-radius: var(--radius-sm);
	color: var(--color-text-muted);
	background: var(--color-surface-soft);
	font-size: 14px;
	line-height: 1.45;
`;

/**
 * The check-in iMac's printing station, as a phase of the Check-In station: whether it is checking
 * in right now, which account signs in, and the market-day steps. Its last step is ticked by the
 * station's own check-in. The iMac's automation starts the station; starting it by hand, from
 * Terminal, is under When You Need It.
 */
export const PrintStationCard = observer(function PrintStationCard() {
	const t = adminTranslations.en.printStationCard;
	const { admin } = useRootStore();
	const online = admin.printStationOnline;

	useEffect(() => {
		const poller = new PageVisibilityPoller(
			() => void admin.checkPrintStation(),
			checkIntervalMs,
			() => {},
		);

		poller.start();

		return () => poller.stop();
	}, [admin]);

	return (
		<ChecklistPhase
			letter="B"
			title={t.title}
			aside={
				online === null ? null : (
					<Status data-online={online} role="status">
						{online ? t.online : t.offline}
					</Status>
				)
			}
		>
			<Account>{t.account}</Account>
			<ChecklistTaskList steps={t.steps} />
		</ChecklistPhase>
	);
});
