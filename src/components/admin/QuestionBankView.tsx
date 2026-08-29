import styled from '@emotion/styled';
import type { FormEvent } from 'react';

import { adminTranslations } from '../../adminLocales';
import { AppButton } from '../AppButton';
import type { Question } from './types';

export type QuestionBankViewProps = {
	busy?: boolean;
	editable: boolean;
	questions: Question[];
	onQuestionsChange: (questions: Question[]) => void;
	onSave: () => void;
};

const Section = styled.section`
	.questions-heading {
		display: flex;
		justify-content: space-between;
		gap: 14px;
		align-items: center;
		margin-top: 5px;
	}

	.questions-heading h3 {
		margin: 0;
		font-family: var(--font-heading);
		text-transform: uppercase;
	}

	.questions-heading button,
	.remove-button {
		border: 0;
		color: var(--color-brand);
		background: transparent;
		font-weight: 700;
	}

	.question-row {
		display: grid;
		gap: 8px;
		padding: 12px;
		border-radius: var(--radius-md);
		background: #f3f6f4;
	}

	.question-row .check-label {
		display: flex;
		align-items: center;
	}

	.check-label input {
		width: 20px;
		min-height: 20px;
	}

	.remove-button {
		justify-self: start;
		color: var(--color-error);
		padding: 5px 0;
	}

	@media (min-width: 560px) {
		.question-row {
			grid-template-columns: minmax(0, 2fr) 1fr auto auto;
			align-items: center;
		}
	}
`;

/** The per-session questions a guest answers when entering the lottery. */
export function QuestionBankView({
	busy,
	editable,
	questions,
	onQuestionsChange,
	onSave,
}: QuestionBankViewProps) {
	const t = adminTranslations.en;

	function update(index: number, patch: Partial<Question>) {
		onQuestionsChange(
			questions.map((question, at) => (at === index ? { ...question, ...patch } : question)),
		);
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		onSave();
	}

	return (
		<Section className="admin-section settings-card">
			<div className="questions-heading">
				<h2>{t.questions}</h2>
				<button
					type="button"
					onClick={() =>
						onQuestionsChange([...questions, { prompt: '', type: 'text', required: false }])
					}
				>
					+ {t.addQuestion}
				</button>
			</div>
			<form onSubmit={handleSubmit}>
				{questions.map((question, index) => (
					<div key={question.id ?? index} className="question-row">
						<input
							value={question.prompt}
							placeholder={t.questionPlaceholder}
							required
							onChange={(event) => update(index, { prompt: event.target.value })}
							onBlur={(event) => update(index, { prompt: event.target.value.trim() })}
						/>
						<select
							value={question.type}
							onChange={(event) => update(index, { type: event.target.value as Question['type'] })}
						>
							<option value="text">{t.textAnswer}</option>
							<option value="scale">{t.scaleAnswer}</option>
						</select>
						<label className="check-label">
							<input
								type="checkbox"
								checked={question.required}
								onChange={(event) => update(index, { required: event.target.checked })}
							/>{' '}
							{t.required}
						</label>
						<button
							className="remove-button"
							type="button"
							onClick={() => onQuestionsChange(questions.filter((_, at) => at !== index))}
						>
							{t.remove}
						</button>
					</div>
				))}
				<AppButton type="submit" disabled={busy || !editable} label={t.saveSettings} />
			</form>
		</Section>
	);
}
