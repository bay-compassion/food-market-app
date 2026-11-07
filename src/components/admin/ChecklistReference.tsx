import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';
import { ChecklistDisclosure } from './ChecklistDisclosure';
import { PrintStationByHand } from './PrintStationByHand';
import { PrintStationFirstTimeSetup } from './PrintStationFirstTimeSetup';
import { PrintStationTroubleshooting, troubleshootingTopics } from './PrintStationTroubleshooting';

const guideUrl =
	'https://github.com/bay-compassion/food-market-app/blob/main/docs/name-tag-printing.md';

const Reference = styled.section`
	display: grid;
	gap: 12px;

	h2 {
		margin: 0;
	}

	.guide {
		justify-self: center;
		padding: 12px;
		color: var(--color-brand);
		font-weight: 700;
	}
`;

/**
 * What the Checklist needs only now and then: what to do when something misbehaves, starting the
 * printing station by hand when its automation doesn't, and setting up a computer for the first time. Kept below the stations and folded, so a normal market day reads
 * straight down the steps without it.
 */
export function ChecklistReference() {
	const t = adminTranslations.en.checklist.reference;

	return (
		<Reference className="admin-section">
			<h2>{t.title}</h2>
			<ChecklistDisclosure
				variant="card"
				summary={t.troubleshootingTitle}
				topics={troubleshootingTopics}
			>
				<PrintStationTroubleshooting />
			</ChecklistDisclosure>
			<ChecklistDisclosure variant="card" summary={t.byHandTitle}>
				<PrintStationByHand />
			</ChecklistDisclosure>
			<ChecklistDisclosure variant="card" summary={t.setupTitle}>
				<PrintStationFirstTimeSetup />
			</ChecklistDisclosure>
			<a className="guide" href={guideUrl} target="_blank" rel="noopener">
				{adminTranslations.en.printStationCard.guide}
			</a>
		</Reference>
	);
}
