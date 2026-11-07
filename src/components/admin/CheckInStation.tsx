import { adminTranslations } from '../../adminLocales';
import { stationMarks } from './ChecklistFloorPlan';
import { ChecklistPhase } from './ChecklistPhase';
import { ChecklistStation } from './ChecklistStation';
import { ChecklistTaskList, stepIds } from './ChecklistTaskList';
import { PrintStationCard } from './PrintStationCard';
import { QueueDeskPhase } from './QueueDeskPhase';

/**
 * The cabinet at the edge of the lobby is put in place and plugged in first. Its iMac then does two
 * jobs. Its Chrome, started with the printing station's launch command, prints the name tags; the
 * check-in operator then runs the line from the desktop queue desk in an ordinary window beside
 * it. The station comes first because its setup quits Chrome, which would close a queue desk
 * already open. The two windows need different sign-ins: the station's account can print but not
 * change the queue.
 */
export function CheckInStation({ number }: { number: number }) {
	const t = adminTranslations.en.checklist.checkIn;
	const printing = adminTranslations.en.printStationCard;

	return (
		<ChecklistStation
			number={number}
			title={t.title}
			place={t.place}
			stepIds={stepIds(t.placeSteps, printing.steps, t.queueDeskSteps)}
			closeUp={{ center: stationMarks.checkIn, alt: t.closeUpAlt }}
			doneWhen={t.doneWhen}
		>
			<ChecklistPhase letter="A" title={t.placeTitle}>
				<ChecklistTaskList steps={t.placeSteps} />
			</ChecklistPhase>
			<PrintStationCard />
			<QueueDeskPhase />
		</ChecklistStation>
	);
}
