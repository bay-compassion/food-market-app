import styled from '@emotion/styled';
import { Button } from '@mui/material';

import { adminTranslations } from '../../adminLocales';
import { printStationLaunchCommand, printStationUrl } from '../print-station/PrintStationSetup';
import { ChecklistAddress } from './ChecklistAddress';
import { LaunchCommand } from './LaunchCommand';

const ByHand = styled.div`
	display: grid;
	gap: 14px;

	p {
		margin: 0;
		color: var(--color-text-subtle);
		font-size: 14px;
		line-height: 1.45;
	}

	.instead {
		display: grid;
		gap: 8px;
		justify-items: start;
		padding-top: 12px;
		border-top: 1px solid var(--color-divider);
	}
`;

/**
 * Starting the printing station in Chrome when Compassion Food Market won't start: the market-day
 * Terminal command, then the queue desk in Chrome's everyday window, since the app isn't there to
 * hold it. Failing the command, the station opens from this page; that makes whatever device opened
 * it the station, so it is only for the iMac.
 */
export function PrintStationByHand() {
	const t = adminTranslations.en.printStationCard;
	const reference = adminTranslations.en.checklist.reference;

	return (
		<ByHand>
			<p>{reference.byHandIntro}</p>
			<LaunchCommand label={t.commandLabel} command={printStationLaunchCommand} />
			<p>{reference.byHandQueueDesk}</p>
			<ChecklistAddress label={reference.byHandQueueDeskLabel} path="/queue" />
			<div className="instead">
				<p>{t.openInstead}</p>
				<Button variant="outlined" href={printStationUrl} target="_blank" rel="noopener">
					{t.open}
				</Button>
			</div>
		</ByHand>
	);
}
