import { observer } from 'mobx-react-lite';

import { QueueNumber } from '../../models/queue-number';
import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import type { StandbyEntryStore } from '../../stores/standby-entry.store';
import { GuestForm } from '../guest-view/forms/GuestForm';
import { GuestInformationForm } from '../guest-view/forms/GuestInformationForm';
import { GuestLotteryForm } from '../guest-view/forms/GuestLotteryForm';
import { QueueNumberBoard } from '../guest-view/visit-status/QueueNumberBoard';
import { StandingCard } from '../guest-view/visit-status/StandingCard';

/**
 * Joining standby: the S number the guest's ticket holds, then their own registration fields with no
 * session questions — those are asked of guests entering the draw, which a standby guest is not.
 */
export const StandbyForm = observer(function StandbyForm({ entry }: { entry: StandbyEntryStore }) {
	const t = useTranslation();
	const { guest, registration, translations } = useRootStore();
	const copy = t.standby;

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
			{entry.ticket ? (
				<StandingCard>
					<QueueNumberBoard
						label={copy.heldLabel}
						number={QueueNumber.standby(entry.ticket.standbyNumber)}
					/>
				</StandingCard>
			) : null}
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
