import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';

import { adminTranslations } from '../../adminLocales';
import { PageVisibilityPoller } from '../../services/page-visibility-poller';
import { useRootStore } from '../../stores/react/store-context';
import { printStationLaunchCommand, printStationUrl } from '../print-station/PrintStationSetup';
import { ChecklistSteps } from './ChecklistSteps';
import { LaunchCommand } from './LaunchCommand';
import { PrintStationFirstTimeSetup } from './PrintStationFirstTimeSetup';
import { PrintStationTroubleshooting } from './PrintStationTroubleshooting';

/** How often the card looks again at whether the station is checking in. */
const checkIntervalMs = 15_000;

const guideUrl =
	'https://github.com/bay-compassion/food-market-app/blob/main/docs/name-tag-printing.md';

const Card = styled.section`
	display: grid;
	gap: 14px;

	.heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}

	h3,
	h4,
	p {
		margin: 0;
	}

	h3 {
		font-size: 18px;
	}

	h4 {
		font-size: 16px;
	}

	p {
		color: var(--color-text-subtle);
		line-height: 1.5;
	}

	.status {
		padding: 4px 10px;
		border-radius: var(--radius-pill);
		background: var(--color-surface-soft);
		font-size: 13px;
		font-weight: 700;
		white-space: nowrap;
	}

	.status[data-online='true'] {
		color: var(--color-success);
	}

	.status[data-online='false'] {
		color: var(--color-error);
	}

	.open-hint {
		margin-top: -6px;
		font-size: 13px;
		text-align: center;
	}

	.account {
		font-size: 14px;
	}

	.account a {
		color: var(--color-brand);
		font-weight: 700;
	}
`;

/**
 * The check-in computer's printing station on the Checklist screen: whether it is checking in right
 * now, what to do to start it on a market day, the one-time setup behind a disclosure, and what to
 * do when it misbehaves. Written for a volunteer who has never opened Terminal.
 *
 * Whatever device opens the station becomes it and takes the tags, so the hint under the button
 * says which computer it belongs on.
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
		<Card className="print-station-card">
			<div className="heading">
				<h3>{t.title}</h3>
				{online === null ? null : (
					<span className="status" data-online={online} role="status">
						{online ? t.online : t.offline}
					</span>
				)}
			</div>
			<p>{t.intro}</p>

			<h4>{t.dailyTitle}</h4>
			<ChecklistSteps steps={t.dailySteps} />
			<LaunchCommand label={t.dailyCommandLabel} command={printStationLaunchCommand} />

			<Button variant="outlined" href={printStationUrl} target="_blank" rel="noopener" fullWidth>
				{t.open}
			</Button>
			<p className="open-hint">{t.openHint}</p>

			<PrintStationFirstTimeSetup />
			<PrintStationTroubleshooting />

			<p className="account">
				{t.account}{' '}
				<a href={guideUrl} target="_blank" rel="noopener">
					{t.guide}
				</a>
			</p>
		</Card>
	);
});
