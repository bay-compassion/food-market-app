import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';
import { printStationFirstRunCommand } from '../print-station/PrintStationSetup';
import { ChecklistSteps } from './ChecklistSteps';
import { LaunchCommand } from './LaunchCommand';

const Setup = styled.details`
	padding: 12px 14px;
	border-radius: var(--radius-md);
	background: var(--color-surface-soft);

	summary {
		min-height: 24px;
		font-weight: 700;
		cursor: pointer;
	}

	.content {
		display: grid;
		gap: 14px;
		margin-top: 12px;
	}

	/* The command's own box is the same soft surface as this one, so it steps back to the page. */
	.content pre {
		background: var(--color-background);
	}
`;

/**
 * Done once per computer: the printer driver, the default printer, and one tag printed through the
 * dialog so Chrome saves the settings silent printing reuses. Collapsed, so the daily steps lead.
 */
export function PrintStationFirstTimeSetup() {
	const t = adminTranslations.en.printStationCard;

	return (
		<Setup>
			<summary>{t.setupTitle}</summary>
			<div className="content">
				<ChecklistSteps steps={t.setupSteps} />
				<LaunchCommand label={t.setupCommandLabel} command={printStationFirstRunCommand} />
			</div>
		</Setup>
	);
}
