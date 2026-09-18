import { Alert } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';
import { useScheduleStore } from '../../stores/react/use-schedule-store';
import { QuestionBankView } from '../admin/QuestionBankView';
import type { Question } from '../admin/types';

/**
 * The question bank, editing the recurrence pattern's questions. Each session copies them when the
 * pattern creates it, so saving here regenerates an unjoined Pending session — the same as saving
 * the pattern on the Schedule tab, and confirmed the same way.
 */
export const PatternQuestionBank = observer(function PatternQuestionBank() {
	const t = adminTranslations.en;
	const schedule = useScheduleStore();
	const { confirmation } = useRootStore();
	const pattern = schedule.patternInput;
	const [questions, setQuestions] = useState<Question[]>([]);

	useEffect(() => {
		void schedule.load();
	}, [schedule]);

	// Seed the editor whenever the saved questions change — on load, and after a save.
	useEffect(() => {
		setQuestions(pattern?.questions ?? []);
	}, [pattern?.questions]);

	async function save() {
		if (!pattern) {
			return;
		}

		if (
			schedule.savingPatternReplacesPending &&
			!(await confirmation.ask({
				question: t.scheduleConfirmReplacePending,
				details: [t.scheduleConfirmReplacePendingDetails],
				confirmLabel: t.confirmContinue,
				dismissLabel: t.cancel,
			}))
		) {
			return;
		}

		await schedule.savePattern({ ...pattern, questions });
	}

	return (
		<>
			{schedule.isLoaded && !pattern ? (
				<Alert severity="info">{t.questionBankNeedsPattern}</Alert>
			) : null}
			<QuestionBankView
				questions={questions}
				onQuestionsChange={setQuestions}
				busy={schedule.isBusy}
				editable={pattern !== null}
				onSave={() => void save()}
			/>
		</>
	);
});
