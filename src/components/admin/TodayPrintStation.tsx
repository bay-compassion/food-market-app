import { observer } from 'mobx-react-lite';
import { useId } from 'react';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';
import { PrintStationStatus } from './PrintStationStatus';
import { PrintTestTagButton } from './PrintTestTagButton';
import { TodaySection } from './today-section.styles';
import { usePrintStationCheck } from './use-print-station-check';

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
		<TodaySection aria-labelledby={headingId}>
			<div className="heading">
				<h2 id={headingId}>{t.printingStation}</h2>
				<PrintStationStatus />
			</div>
			<p>{t.printingStationHelp}</p>
			<PrintTestTagButton />
		</TodaySection>
	);
});
