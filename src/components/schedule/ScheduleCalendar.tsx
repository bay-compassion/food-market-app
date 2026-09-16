import styled from '@emotion/styled';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickerDay, type PickerDayProps } from '@mui/x-date-pickers/PickerDay';
import { DateTime } from 'luxon';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { useScheduleStore } from '../../stores/react/use-schedule-store';
import type { PipDates } from '../../stores/schedule.store';

const Day = styled.span`
	position: relative;
	display: inline-flex;

	.schedule-pip {
		position: absolute;
		bottom: 3px;
		left: 50%;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		transform: translateX(-50%);
		pointer-events: none;
	}

	.schedule-pip[data-kind='session'] {
		background: var(--color-brand);
	}

	.schedule-pip[data-kind='projected'] {
		border: 1.5px solid var(--color-brand);
	}
`;

type ScheduleDayProps = PickerDayProps & { pips?: PipDates };

/** A calendar day with a pip: filled for a session, hollow for a date the pattern covers. */
function ScheduleDay({ pips, ...props }: ScheduleDayProps) {
	const date = (props.day as DateTime).toISODate();
	const kind =
		props.outsideCurrentMonth || !date || !pips
			? null
			: pips.sessions.has(date)
				? 'session'
				: pips.projected.has(date)
					? 'projected'
					: null;

	return (
		<Day>
			<PickerDay {...props} />
			{kind ? <span className="schedule-pip" data-kind={kind} aria-hidden="true" /> : null}
		</Day>
	);
}

/**
 * The month view. Picking a date narrows the grid to it; picking it again shows everything. Dates
 * are the location's, whatever time zone the phone is set to.
 */
export const ScheduleCalendar = observer(function ScheduleCalendar() {
	const t = adminTranslations.en;
	const schedule = useScheduleStore();
	const location = schedule.location;

	if (!location) {
		return null;
	}

	return (
		<DateCalendar
			aria-label={t.scheduleCalendarLabel}
			timezone={location.timeZone}
			value={
				schedule.selectedDate
					? DateTime.fromISO(schedule.selectedDate, { zone: location.timeZone })
					: null
			}
			onChange={(value) => {
				const date = value?.toISODate() ?? null;

				schedule.selectDate(date === schedule.selectedDate ? null : date);
			}}
			onMonthChange={(month) => schedule.setVisibleMonth(month.toISODate()!)}
			slots={{ day: ScheduleDay }}
			slotProps={{ day: { pips: schedule.pipDates } as Partial<ScheduleDayProps> }}
		/>
	);
});
