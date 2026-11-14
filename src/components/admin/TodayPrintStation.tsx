import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';
import { PrintStationStatus } from './PrintStationStatus';
import { PrintTestTagButton } from './PrintTestTagButton';
import { usePrintStationCheck } from './use-print-station-check';

const Section = styled.section`
	display: grid;
	gap: 10px;

	.heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
	}

	h2 {
		margin: 0;
		color: var(--color-brand-dark);
		font-family: var(--font-heading);
		font-size: 18px;
		font-weight: 700;
		text-transform: none;
	}

	p {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 14px;
	}
`;

/**
 * The print station on the Today screen: whether it is online, and a test tag to check the label
 * printer before the first guest's tag — or after new labels go in. Only for a worker who can run
 * the queue, the same people who send name tags.
 */
export const TodayPrintStation = observer(function TodayPrintStation() {
	const t = adminTranslations.en.today;
	const { admin } = useRootStore();
	const headingId = useId();

	usePrintStationCheck();

	if (admin.printStationOnline === null) {
		return null;
	}

	return (
		<Section aria-labelledby={headingId}>
			<div className="heading">
				<h2 id={headingId}>{t.printingStation}</h2>
				<PrintStationStatus />
			</div>
			<p>{t.printingStationHelp}</p>
			<PrintTestTagButton />
		</Section>
	);
});
