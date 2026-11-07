import styled from '@emotion/styled';
import { Button } from '@mui/material';

import { adminTranslations } from '../../adminLocales';
import { printStationLaunchCommand, printStationUrl } from '../print-station/PrintStationSetup';
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
 * Starting the printing station without the iMac's automation: the market-day Terminal command, or,
 * failing that, opening the station from this page. Opening it here makes whatever device opened it
 * the station, so it is only for the iMac.
 */
export function PrintStationByHand() {
	const t = adminTranslations.en.printStationCard;

	return (
		<ByHand>
			<p>{adminTranslations.en.checklist.reference.byHandIntro}</p>
			<LaunchCommand label={t.commandLabel} command={printStationLaunchCommand} />
			<div className="instead">
				<p>{t.openInstead}</p>
				<Button variant="outlined" href={printStationUrl} target="_blank" rel="noopener">
					{t.open}
				</Button>
			</div>
		</ByHand>
	);
}
