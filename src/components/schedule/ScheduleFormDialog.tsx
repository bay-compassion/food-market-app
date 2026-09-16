import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTime } from 'luxon';
import { useId, useState, type FormEvent } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { SessionTemplate } from '../../services/schedule-payload';
import { useScheduleStore } from '../../stores/react/use-schedule-store';
import { QuestionListEditor } from '../admin/QuestionListEditor';
import type { Question } from '../admin/types';
import { Dialog } from '../ui/Dialog';
import { SessionTemplateFields, draftFrom, templateFrom } from './SessionTemplateFields';

export type ScheduleFormDialogProps = {
	title: string;
	/** The label of the date field: the pattern's first date, or the session's date. */
	dateLabel: string;
	initial: SessionTemplate & { date: string };
	busy?: boolean;
	onSubmit: (value: SessionTemplate & { date: string }) => void;
	onClose: () => void;
};

/** Rendered in a portal, outside the dashboard's own form spacing, so it sets its own. */
const Form = styled.form`
	display: grid;
	gap: 15px;

	/* The dashboard's stylesheet outlines every bare input; an MUI input's wrapper draws its own. */
	.MuiInputBase-input {
		min-height: 0;
		border: 0;
		border-radius: 0;
		background: transparent;
	}
`;

/**
 * The form behind the pattern, one-off, and edit-session dialogs: a date, the shared session
 * settings, and the registration questions. Mounted only while open, so each opening starts from
 * `initial`.
 */
export function ScheduleFormDialog({
	title,
	dateLabel,
	initial,
	busy,
	onSubmit,
	onClose,
}: ScheduleFormDialogProps) {
	const t = adminTranslations.en;
	const formId = useId();
	// Dates and times are the market's, whatever time zone the phone is set to.
	const timeZone = useScheduleStore().location?.timeZone ?? 'default';
	const [date, setDate] = useState<DateTime | null>(() =>
		DateTime.fromISO(initial.date, { zone: timeZone }),
	);
	const [draft, setDraft] = useState(() => draftFrom(initial, timeZone));
	const [questions, setQuestions] = useState<Question[]>(initial.questions);
	const template = templateFrom(draft);
	const localDate = date?.isValid ? date.toISODate() : null;

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (template && localDate) {
			onSubmit({ ...template, date: localDate, questions });
		}
	}

	return (
		<Dialog
			open
			title={title}
			closeLabel={t.cancel}
			onClose={onClose}
			actions={
				<>
					<Button type="button" variant="outlined" onClick={onClose}>
						{t.cancel}
					</Button>
					<Button type="submit" form={formId} disabled={busy || !template || !localDate}>
						{t.scheduleSave}
					</Button>
				</>
			}
		>
			<Form id={formId} className="admin-dashboard" onSubmit={handleSubmit}>
				<DatePicker label={dateLabel} timezone={timeZone} value={date} onChange={setDate} />
				<SessionTemplateFields draft={draft} timeZone={timeZone} onChange={setDraft} />
				<QuestionListEditor questions={questions} onChange={setQuestions} />
			</Form>
		</Dialog>
	);
}
