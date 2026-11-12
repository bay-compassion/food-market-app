import { adminTranslations } from '../../adminLocales';
import { stationMarks } from './ChecklistFloorPlan';
import { ChecklistPhase } from './ChecklistPhase';
import { ChecklistStation } from './ChecklistStation';
import { ChecklistTaskList, stepIds } from './ChecklistTaskList';
import { PrintStationCard } from './PrintStationCard';

/**
 * The cabinet at the edge of the lobby is put in place and plugged in first. Its iMac then runs
 * Compassion Food Market, the desktop app whose one window is both the check-in operator's queue
 * desk and, in a panel beside it, the printing station that prints the name tags. One sign-in
 * covers both.
 */
export function CheckInStation({ number }: { number: number }) {
	const t = adminTranslations.en.checklist.checkIn;
	const printing = adminTranslations.en.printStationCard;

	return (
		<ChecklistStation
			number={number}
			title={t.title}
			place={t.place}
			stepIds={stepIds(t.placeSteps, printing.steps)}
			closeUp={{ center: stationMarks.checkIn, alt: t.closeUpAlt }}
			doneWhen={t.doneWhen}
		>
			<ChecklistPhase letter="A" title={t.placeTitle}>
				<ChecklistTaskList steps={t.placeSteps} />
			</ChecklistPhase>
			<PrintStationCard />
		</ChecklistStation>
	);
}
