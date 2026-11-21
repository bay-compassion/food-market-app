import { observer } from 'mobx-react-lite';

import type { PremarketEntryStore } from '../../stores/premarket-entry.store';
import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import { GuestForm } from '../guest-view/forms/GuestForm';
import { GuestInformationForm } from '../guest-view/forms/GuestInformationForm';
import { GuestLotteryForm } from '../guest-view/forms/GuestLotteryForm';

/**
 * A volunteer's premarket check-in: the guest's own registration fields, with no session questions —
 * those are asked of guests entering the draw, which a volunteer is not.
 */
export const PremarketForm = observer(function PremarketForm({
	entry,
}: {
	entry: PremarketEntryStore;
}) {
	const t = useTranslation();
	const { guest, registration, translations } = useRootStore();
	const copy = t.premarket;

	return (
		<GuestForm
			title={copy.title}
			description={copy.description}
			submitLabel={copy.submit}
			submittingLabel={copy.submitting}
			onSubmit={() => entry.submit(translations.locale)}
			stickySubmit
			ready={registration.isReadyToSubmit([])}
		>
			{/* A returning guest's saved name and phone are not asked again, as on the home screen. */}
			{guest.identity === null || guest.hasIncompleteName ? <GuestInformationForm /> : null}
			<GuestLotteryForm
				registrationQuestions={[]}
				copy={{ lotteryLegend: copy.householdLegend }}
				asksRaceEthnicity={false}
			/>
		</GuestForm>
	);
});
