import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';
import { FullscreenGlyph } from '../kiosk/FullscreenGlyph';
import { ChecklistAddress } from './ChecklistAddress';
import { stationMarks } from './ChecklistFloorPlan';
import { ChecklistStation } from './ChecklistStation';
import { ChecklistTaskList, stepIds } from './ChecklistTaskList';
import { RoomDisplayHardware } from './RoomDisplayHardware';

const Hint = styled.p`
	margin: 0;
	color: var(--color-text-subtle);
	font-size: 14px;
	line-height: 1.45;
`;

/** A link that opens a help topic further down, rather than going anywhere. */
const HelpLink = styled.button`
	padding: 0;
	border: 0;
	color: var(--color-brand);
	background: transparent;
	font: inherit;
	font-size: 14px;
	font-weight: 700;
	text-align: start;
	text-decoration: underline;
	cursor: pointer;
`;

/** The kiosk view's own full-screen button, drawn as it looks in the view's corner. */
const BoardButton = styled.span`
	display: inline-grid;
	padding: 8px;
	place-items: center;
	border: 1px solid currentColor;
	border-radius: var(--radius-pill);
	color: var(--color-brand-dark);
	font-size: 22px;
`;

/**
 * Putting the `/kiosk` view up on the TV in the auditorium. The unlock code comes from the
 * same dialog the queue screen's menu opens, which the dashboard already mounts; a worker who can't
 * run the queue can't ask for one, so they are told who can instead. The Mac mini is too old for
 * current certificates, so its Chrome warns about the app's; the step links to how to get past that, on the Help screen.
 * The view fills the screen from its own button, clicked with the keyboard's touchpad, rather than
 * a shortcut that depends on how that Windows-layout keyboard is mapped.
 */
export const RoomDisplayStation = observer(function RoomDisplayStation({
	number,
	onOpenHelp,
}: {
	number: number;
	/** Opens the Help screen, where the certificate warning's fix is. */
	onOpenHelp: () => void;
}) {
	const t = adminTranslations.en.checklist.roomDisplay;
	const { admin, checklist } = useRootStore();

	return (
		<ChecklistStation
			number={number}
			title={t.title}
			place={t.place}
			stepIds={stepIds(t.steps)}
			closeUp={{ center: stationMarks.roomDisplay, alt: t.closeUpAlt }}
			doneWhen={t.doneWhen}
		>
			<ChecklistTaskList
				steps={t.steps}
				extras={{
					'room-turn-on': <RoomDisplayHardware />,
					'room-open': (
						<>
							<ChecklistAddress label={t.addressLabel} path="/kiosk" />
							<HelpLink
								type="button"
								onClick={() => {
									checklist.reveal('certificate-warning');
									onOpenHelp();
								}}
							>
								{t.certificateHelp}
							</HelpLink>
							{admin.can('run:queue') ? (
								<>
									<Hint>{t.unlockHint}</Hint>
									<Button variant="outlined" onClick={() => void admin.showKioskUnlockCode()}>
										{t.getCode}
									</Button>
								</>
							) : (
								<Hint>{t.askForCode}</Hint>
							)}
						</>
					),
					'room-full-screen': (
						<BoardButton role="img" aria-label={t.fullScreenButtonAlt}>
							<FullscreenGlyph />
						</BoardButton>
					),
				}}
			/>
		</ChecklistStation>
	);
});
