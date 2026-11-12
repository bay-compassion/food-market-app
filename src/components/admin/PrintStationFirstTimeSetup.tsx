import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';
import { printStationFirstRunCommand } from '../print-station/PrintStationSetup';
import { LaunchCommand } from './LaunchCommand';

const Setup = styled.div`
	display: grid;
	gap: 14px;

	p {
		margin: 0;
		color: var(--color-text-subtle);
		font-size: 14px;
		line-height: 1.45;
	}

	h3 {
		margin: 0;
		font-family: var(--font-heading);
		font-size: 18px;
	}

	.computer {
		display: grid;
		gap: 12px;
	}

	.group {
		display: grid;
		gap: 6px;
		padding-top: 10px;
		border-top: 1px solid var(--color-divider);
	}

	h4 {
		margin: 0;
		color: var(--color-brand-dark);
		font-size: 14px;
	}

	ol {
		display: grid;
		gap: 6px;
		margin: 0;
		padding-inline-start: 20px;
		color: var(--color-text-muted);
		line-height: 1.45;
	}
`;

/**
 * Done once per computer, never on a market day: the check-in iMac's printer driver, default
 * printer, and Compassion Food Market installed and signed in, plus, as a backup, one tag printed
 * through Chrome's dialog so Chrome saves the settings its silent printing reuses; and the room
 * display's Mac mini, set to start, log in, and open Chrome on its own when
 * the stand is plugged in, and kept from sleeping.
 */
export function PrintStationFirstTimeSetup() {
	const t = adminTranslations.en.printStationCard;
	const reference = adminTranslations.en.checklist.reference;

	return (
		<Setup>
			<p>{reference.setupIntro}</p>
			<section className="computer">
				<h3>{t.setupTitle}</h3>
				{t.setupGroups.map((group) => (
					<div className="group" key={group.title}>
						<h4>{group.title}</h4>
						<ol>
							{group.steps.map((step) => (
								<li key={step}>{step}</li>
							))}
						</ol>
					</div>
				))}
				<LaunchCommand label={t.setupCommandLabel} command={printStationFirstRunCommand} />
			</section>
			<section className="computer">
				<h3>{reference.macMiniTitle}</h3>
				<p>{reference.macMiniIntro}</p>
				<ol>
					{reference.macMiniSteps.map((step) => (
						<li key={step}>{step}</li>
					))}
				</ol>
			</section>
		</Setup>
	);
}
