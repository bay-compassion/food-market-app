import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { GuestStateMessage } from '../GuestStateMessage';
import { GuestForm } from './GuestForm';
import { GuestInformationForm } from './GuestInformationForm';

/** Identity-only signup for later visits; it never creates or joins a market visit. */
export const GuestSignupForm = observer(function GuestSignupForm() {
	const t = useTranslation();
	const rootStore = useRootStore();
	const { registration } = rootStore;
	const [isInformationSaved, setIsInformationSaved] = useState(false);

	async function submit() {
		const result = await registration.submit('early', null, rootStore.translations.locale);

		if (result.kind === 'signed-up') {
			setIsInformationSaved(true);
		}
	}

	if (isInformationSaved) {
		return (
			<GuestStateMessage
				heading={t.signupView.successTitle}
				description={t.signupView.successDescription}
			/>
		);
	}

	return (
		<GuestForm
			title={t.signupView.formTitle}
			description={t.signupView.formDescription}
			submitLabel={t.signupView.submit}
			submittingLabel={t.signupView.submitting}
			onSubmit={submit}
		>
			<GuestInformationForm />
		</GuestForm>
	);
});
