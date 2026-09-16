import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { useId, useState, type FormEvent } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { SessionTemplate } from '../../services/schedule-payload';
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

	small {
		color: var(--color-text-subtle);
		font-family: var(--font-body);
		font-weight: 400;
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
	const [date, setDate] = useState(initial.date);
	const [draft, setDraft] = useState(() => draftFrom(initial));
	const [questions, setQuestions] = useState<Question[]>(initial.questions);

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		onSubmit({ ...templateFrom(draft), date, questions });
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
					<Button type="submit" form={formId} disabled={busy}>
						{t.scheduleSave}
					</Button>
				</>
			}
		>
			<Form id={formId} className="admin-dashboard" onSubmit={handleSubmit}>
				<label>
					<span>{dateLabel}</span>
					<input
						type="date"
						required
						value={date}
						onChange={(event) => setDate(event.target.value)}
					/>
				</label>
				<SessionTemplateFields draft={draft} onChange={setDraft} />
				<QuestionListEditor questions={questions} onChange={setQuestions} />
			</Form>
		</Dialog>
	);
}
