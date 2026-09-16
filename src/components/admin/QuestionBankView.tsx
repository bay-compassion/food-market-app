import { Button } from '@mui/material';
import type { FormEvent } from 'react';

import { adminTranslations } from '../../adminLocales';
import { QuestionListEditor } from './QuestionListEditor';
import type { Question } from './types';

export type QuestionBankViewProps = {
	busy?: boolean;
	editable: boolean;
	questions: Question[];
	onQuestionsChange: (questions: Question[]) => void;
	onSave: () => void;
};

/** The per-session questions a guest answers when entering the lottery. */
export function QuestionBankView({
	busy,
	editable,
	questions,
	onQuestionsChange,
	onSave,
}: QuestionBankViewProps) {
	const t = adminTranslations.en;

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		onSave();
	}

	return (
		<section className="admin-section settings-card">
			<form onSubmit={handleSubmit}>
				<QuestionListEditor
					questions={questions}
					onChange={onQuestionsChange}
					readOnly={!editable}
				/>
				<Button type="submit" disabled={busy || !editable}>
					{t.saveSettings}
				</Button>
			</form>
		</section>
	);
}
