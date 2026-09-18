import styled from '@emotion/styled';
import { Button, Chip } from '@mui/material';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { ScheduleRow, ScheduleRowAction } from '../../models/schedule-row';
import { useRootStore } from '../../stores/react/store-context';
import { useScheduleStore } from '../../stores/react/use-schedule-store';
import { ScheduleCalendar } from './ScheduleCalendar';
import { ScheduleFormDialog } from './ScheduleFormDialog';
import { ScheduleGrid } from './ScheduleGrid';

type DialogState = { kind: 'pattern' } | { kind: 'one-off' } | { kind: 'edit'; sessionId: string };

export type ScheduleViewProps = {
	/** Opens the Session tab, where an active session is run. */
	onNavigateSession: () => void;
};

const Layout = styled.div`
	display: grid;
	gap: 18px;

	.schedule-toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}

	.schedule-toolbar-note {
		width: 100%;
		margin: 0;
		color: var(--color-text-subtle);
		font-size: 14px;
	}

	/* The calendar is a fixed 320px wide: centered on a phone, flush beside the grid on desktop. */
	.MuiDateCalendar-root {
		margin: 0 auto;
	}

	.schedule-help {
		margin: 0;
		color: var(--color-text-subtle);
		font-size: 14px;
		line-height: 1.5;
	}

	@media (min-width: 960px) {
		grid-template-columns: 320px minmax(0, 1fr);
		align-items: start;

		.MuiDateCalendar-root {
			margin: 0;
		}

		.schedule-help {
			grid-column: 1 / -1;
		}
	}
`;

/** The Schedule tab: the recurring pattern, what is coming up, and the calendar to find it on. */
export const ScheduleView = observer(function ScheduleView({
	onNavigateSession,
}: ScheduleViewProps) {
	const t = adminTranslations.en;
	const schedule = useScheduleStore();
	const { confirmation } = useRootStore();
	const [dialog, setDialog] = useState<DialogState | null>(null);

	useEffect(() => {
		void schedule.load();
	}, [schedule]);

	const confirm = useCallback(
		(question: string, details?: string, destructive = false) =>
			confirmation.ask({
				question,
				details: details ? [details] : undefined,
				confirmLabel: t.confirmContinue,
				dismissLabel: t.cancel,
				destructive,
			}),
		[confirmation, t],
	);

	const onAction = useCallback(
		async (row: ScheduleRow, action: ScheduleRowAction) => {
			switch (action) {
				case 'edit':
					setDialog(row.isPattern ? { kind: 'pattern' } : { kind: 'edit', sessionId: row.id });

					return;

				case 'go_to_session':
					onNavigateSession();

					return;

				case 'start_now':
					if (await confirm(t.scheduleConfirmStartNow, t.scheduleConfirmStartNowDetails)) {
						await schedule.startNow();
					}

					return;

				case 'create_next_session':
					if (await confirm(t.scheduleConfirmCreateNext)) {
						await schedule.createNextSession();
					}

					return;

				case 'delete':
					if (row.isPattern) {
						if (
							await confirm(
								t.scheduleConfirmDeletePattern,
								t.scheduleConfirmDeletePatternDetails,
								true,
							)
						) {
							await schedule.deletePattern();
						}
					} else if (await confirm(t.scheduleConfirmDeleteSession, undefined, true)) {
						await schedule.deleteSession(row.id);
					}
			}
		},
		[confirm, onNavigateSession, schedule, t],
	);

	async function submit(value: Parameters<typeof schedule.addOneOff>[0]) {
		if (!dialog) {
			return;
		}

		let saved: boolean;

		if (dialog.kind === 'pattern') {
			const { date, ...template } = value;

			if (
				schedule.pattern &&
				schedule.savingPatternReplacesPending &&
				!(await confirm(t.scheduleConfirmReplacePending, t.scheduleConfirmReplacePendingDetails))
			) {
				return;
			}

			saved = await schedule.savePattern({ ...template, startsOn: date });
		} else if (dialog.kind === 'one-off') {
			if (
				schedule.unfinishedSession &&
				!(await confirm(
					t.scheduleConfirmReplaceWithOneOff,
					t.scheduleConfirmReplaceWithOneOffDetails,
				))
			) {
				return;
			}

			saved = await schedule.addOneOff(value);
		} else {
			saved = await schedule.updateSession(dialog.sessionId, value);
		}

		if (saved) {
			setDialog(null);
		}
	}

	const today = schedule.today ?? '';
	const initial =
		dialog?.kind === 'edit'
			? schedule.sessionInputFor(dialog.sessionId)
			: dialog?.kind === 'pattern' && schedule.patternInput
				? { ...schedule.patternInput, date: schedule.patternInput.startsOn }
				: dialog
					? { ...schedule.templateDefaults, date: schedule.selectedDate ?? today }
					: null;
	const oneOffBlock = schedule.oneOffBlock;
	const location = schedule.location;

	return (
		<LocalizationProvider dateAdapter={AdapterLuxon}>
			<section className="admin-section schedule-view">
				<Layout>
					<ScheduleCalendar />
					<div>
						<div className="schedule-toolbar">
							<Button
								type="button"
								disabled={!schedule.canAddPattern || schedule.isBusy}
								onClick={() => setDialog({ kind: 'pattern' })}
							>
								{t.scheduleAddPattern}
							</Button>
							<Button
								type="button"
								variant="outlined"
								disabled={!schedule.isLoaded || oneOffBlock !== null || schedule.isBusy}
								onClick={() => setDialog({ kind: 'one-off' })}
							>
								{t.scheduleAddOneOff}
							</Button>
							{schedule.selectedDate && location ? (
								<Chip
									label={t.scheduleShowingDate.replace(
										'{date}',
										location.formatDate(schedule.selectedDate),
									)}
									onDelete={() => schedule.selectDate(null)}
									deleteIcon={<span aria-label={t.scheduleClearDate}>×</span>}
								/>
							) : null}
							{oneOffBlock ? (
								<p className="schedule-toolbar-note">
									{oneOffBlock === 'active-session'
										? t.scheduleOneOffBlockedActive
										: t.scheduleOneOffBlockedPending}
								</p>
							) : null}
						</div>
						<ScheduleGrid onAction={(row, action) => void onAction(row, action)} />
					</div>
					<p className="schedule-help">{t.scheduleIntro}</p>
				</Layout>
			</section>
			{dialog && initial ? (
				<ScheduleFormDialog
					title={
						dialog.kind === 'pattern'
							? t.schedulePatternDialogTitle
							: dialog.kind === 'one-off'
								? t.scheduleOneOffDialogTitle
								: t.scheduleSessionDialogTitle
					}
					dateLabel={dialog.kind === 'pattern' ? t.scheduleStartsOn : t.scheduleDate}
					initial={initial}
					busy={schedule.isBusy}
					onSubmit={(value) => void submit(value)}
					onClose={() => setDialog(null)}
				/>
			) : null}
		</LocalizationProvider>
	);
});
