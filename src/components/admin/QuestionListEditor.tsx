import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';
import type { Question } from './types';

export type QuestionListEditorProps = {
	questions: Question[];
	onChange: (questions: Question[]) => void;
	/** Shows the questions without letting them change. */
	readOnly?: boolean;
};

const Editor = styled.div`
	display: grid;
	gap: 12px;

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

/**
 * The registration questions a guest answers when entering the lottery, as an editable list. Used
 * by the question bank and by the Schedule tab's pattern and session dialogs.
 */
export function QuestionListEditor({ questions, onChange, readOnly }: QuestionListEditorProps) {
	const t = adminTranslations.en;

	function update(index: number, patch: Partial<Question>) {
		onChange(
			questions.map((question, at) => (at === index ? { ...question, ...patch } : question)),
		);
	}

	return (
		<Editor>
			<div className="questions-heading">
				<h3>{t.questions}</h3>
				{readOnly ? null : (
					<button
						type="button"
						onClick={() => onChange([...questions, { prompt: '', type: 'text', required: false }])}
					>
						+ {t.addQuestion}
					</button>
				)}
			</div>
			{questions.map((question, index) => (
				<div key={question.id ?? index} className="question-row">
					<input
						aria-label={t.questionPlaceholder}
						value={question.prompt}
						placeholder={t.questionPlaceholder}
						required
						readOnly={readOnly}
						onChange={(event) => update(index, { prompt: event.target.value })}
						onBlur={(event) => update(index, { prompt: event.target.value.trim() })}
					/>
					<select
						value={question.type}
						disabled={readOnly}
						onChange={(event) => update(index, { type: event.target.value as Question['type'] })}
					>
						<option value="text">{t.textAnswer}</option>
						<option value="scale">{t.scaleAnswer}</option>
					</select>
					<label className="check-label">
						<input
							type="checkbox"
							checked={question.required}
							disabled={readOnly}
							onChange={(event) => update(index, { required: event.target.checked })}
						/>{' '}
						{t.required}
					</label>
					{readOnly ? null : (
						<button
							className="remove-button"
							type="button"
							onClick={() => onChange(questions.filter((_, at) => at !== index))}
						>
							{t.remove}
						</button>
					)}
				</div>
			))}
		</Editor>
	);
}
