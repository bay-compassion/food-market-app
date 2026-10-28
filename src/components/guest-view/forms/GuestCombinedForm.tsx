import { observer } from 'mobx-react-lite';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { GuestForm } from './GuestForm';
import { GuestInformationForm } from './GuestInformationForm';
import { GuestJoinSteps } from './GuestJoinSteps';
import { GuestLotteryForm } from './GuestLotteryForm';

/** Today's market-registration form: identity fields when needed, plus lottery-entry fields. */
export const GuestCombinedForm = observer(function GuestCombinedForm() {
	const t = useTranslation();
	const rootStore = useRootStore();
	const { guest, registration, session, visit } = rootStore;
	const registrationQuestions = session.currentState?.questions ?? [];

	async function submit() {
		const marketEventId = session.marketEvent?.id ?? null;
		const result = await registration.submit('queue', marketEventId, rootStore.translations.locale);

		if (result.kind === 'registered' && marketEventId) {
			visit.submit(result.registration, marketEventId);
		}
	}

	return (
		<GuestForm
			title={t.formTitle}
			description={t.formDescription}
			submitLabel={t.submit}
			submittingLabel={t.submitting}
			onSubmit={submit}
			// The form runs to more than a screen on a phone, which left "Join the lottery" out of sight.
			stickySubmit
			ready={registration.isReadyToSubmit(registrationQuestions)}
			progress={<GuestJoinSteps questions={registrationQuestions} />}
		>
			{/* A returning guest's name and phone are saved and shown above; they are not asked again. */}
			{guest.identity === null ? <GuestInformationForm /> : null}
			<GuestLotteryForm registrationQuestions={registrationQuestions} />
		</GuestForm>
	);
});
