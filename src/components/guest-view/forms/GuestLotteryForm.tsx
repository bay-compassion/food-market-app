import { TextField } from '@mui/material';
import { observer } from 'mobx-react-lite';

import type { GuestFormCopy } from '../../../locales';
import type { SessionQuestion } from '../../../stores/market-session.store';
import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { ChangeHouseholdDialog } from './ChangeHouseholdDialog';
import { FormSection } from './FormSection';
import { HouseholdFields } from './HouseholdFields';
import { SavedHouseholdCard } from './SavedHouseholdCard';
import { useGuestFormCopy } from './use-guest-form-copy';

export type GuestLotteryFormProps = {
	/** The session's own questions, which vary per market event. Owned by the container, since it
	 *  is what knows which session is running. */
	registrationQuestions: SessionQuestion[];
	/** Wording to use in place of the guest's own, for a worker filling it in for them. */
	copy?: Partial<GuestFormCopy>;
};

/** The scale answers on offer, 1 through 10. */
const scaleValues = Array.from({ length: 10 }, (_, index) => index + 1);

/**
 * What entering the lottery asks for beyond identity: who the guest is shopping for, and whatever
 * the session itself wants to know.
 *
 * Rendered only when registration is genuinely open — signing up ahead of time collects identity
 * alone, since the household counts are what a specific market day needs.
 */
export const GuestLotteryForm = observer(function GuestLotteryForm({
	registrationQuestions,
	copy: override,
}: GuestLotteryFormProps) {
	const t = useTranslation();
	const copy = useGuestFormCopy(override);
	const { registration } = useRootStore();
	// A household saved from last time is a summary to confirm, not fields to fill in again.
	const showSavedHousehold =
		registration.savedHouseholdReview === 'pending' ||
		registration.savedHouseholdReview === 'confirmed';

	return (
		<>
			<FormSection legend={copy.lotteryLegend}>
				{showSavedHousehold ? (
					<>
						<SavedHouseholdCard />
						<ChangeHouseholdDialog />
					</>
				) : (
					<HouseholdFields
						values={registration.guest}
						onChange={(patch) => registration.updateGuest(patch)}
						copy={override}
					/>
				)}
			</FormSection>
			{registrationQuestions.length > 0 ? (
				<FormSection legend={t.guestView.forms.questionsLegend}>
					{registrationQuestions.map((question) =>
						question.type === 'scale' ? (
							<TextField
								key={question.id}
								label={question.prompt}
								select
								slotProps={{ select: { native: true } }}
								value={registration.registrationAnswers[question.id] ?? ''}
								// Scale answers are sent to the API as numbers.
								onChange={(event) =>
									registration.setAnswer(question.id, Number(event.target.value))
								}
								required={question.required}
							>
								<option value="" disabled>
									{t.chooseAnswer}
								</option>
								{scaleValues.map((value) => (
									<option key={value} value={value}>
										{value}
									</option>
								))}
							</TextField>
						) : (
							<TextField
								key={question.id}
								label={question.prompt}
								multiline
								rows={3}
								value={registration.registrationAnswers[question.id] ?? ''}
								onChange={(event) => registration.setAnswer(question.id, event.target.value)}
								// Trimmed on the way out rather than on every keystroke: trimming as the
								// guest types would eat the space between words as soon as it was pressed.
								onBlur={(event) => registration.setAnswer(question.id, event.target.value.trim())}
								required={question.required}
							/>
						),
					)}
				</FormSection>
			) : null}
		</>
	);
});
