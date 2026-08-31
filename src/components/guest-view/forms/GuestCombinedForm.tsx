import { observer } from 'mobx-react-lite';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { GuestForm } from './GuestForm';
import { GuestInformationForm } from './GuestInformationForm';
import { GuestLotteryForm } from './GuestLotteryForm';

/** Today's market-registration form: identity fields when needed, plus lottery-entry fields. */
export const GuestCombinedForm = observer(function GuestCombinedForm() {
	const t = useTranslation();
	const rootStore = useRootStore();
	const { guest, registration, session, visit } = rootStore;
	const registrationQuestions = session.currentState?.questions ?? [];

	async function submit() {
		const result = await registration.submit(
			'queue',
			session.marketEvent?.id ?? null,
			rootStore.translations.locale,
		);

		if (result.kind === 'registered') {
			visit.submit(result.registration);
		}
	}

	return (
		<GuestForm
			title={t.formTitle}
			description={t.formDescription}
			submitLabel={t.submit}
			submittingLabel={t.submitting}
			onSubmit={submit}
		>
			{guest.identity === null ? <GuestInformationForm /> : null}
			<GuestLotteryForm registrationQuestions={registrationQuestions} />
		</GuestForm>
	);
});
