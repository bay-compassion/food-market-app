import { observer } from 'mobx-react-lite';

import type { GuestProfile } from '../../../models/guest-profile';
import type { VisitCommand } from '../../../services/visitStateMachine';
import { useRootStore } from '../../../stores/react/store-context';
import { HouseholdCard } from './HouseholdCard';
import { LatestNoteCard } from './LatestNoteCard';
import { PastVisitsCard } from './PastVisitsCard';
import { TodayVisitCard } from './TodayVisitCard';

/**
 * The Overview tab: the guest's visit in today's session with the queue's own actions, their
 * household, the latest visits before today's, and the newest note staff keep about them.
 */
export const GuestProfileOverview = observer(function GuestProfileOverview({
	profile,
	onSeeAllVisits,
	onSeeAllNotes,
}: {
	profile: GuestProfile;
	onSeeAllVisits: () => void;
	onSeeAllNotes: () => void;
}) {
	const { admin, session } = useRootStore();
	const currentEventId = session.currentState?.event?.id ?? null;
	const today = profile.visitIn(currentEventId);
	const todayGuest = today ? profile.asQueueGuest(today) : null;

	// The admin store reports a refusal itself; either way the profile rereads what the visit is now.
	async function run(command: VisitCommand) {
		if (todayGuest) {
			await admin.runGuestCommand(todayGuest, command);
			await admin.guestProfile.load(profile.guestId);
		}
	}

	return (
		<>
			{todayGuest ? (
				<TodayVisitCard visit={todayGuest} onRun={(command) => void run(command)} />
			) : null}
			<HouseholdCard profile={profile} />
			<PastVisitsCard visits={profile.pastVisits(currentEventId)} onSeeAll={onSeeAllVisits} />
			{/* Keyed by guest, so another profile reads its own notes. */}
			<LatestNoteCard key={profile.guestId} guestId={profile.guestId} onSeeAll={onSeeAllNotes} />
		</>
	);
});
