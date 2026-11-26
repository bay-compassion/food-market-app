import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';

import { adminTranslations } from '../../../adminLocales';
import type { VisitCommand } from '../../../services/visitStateMachine';
import { useRootStore } from '../../../stores/react/store-context';
import { TicketGuestNotes } from '../../queue/TicketGuestNotes';
import { BackButton } from '../BackButton';
import { GuestProfileHeader } from './GuestProfileHeader';
import { GuestProfileStats } from './GuestProfileStats';
import { HouseholdCard } from './HouseholdCard';
import { PastVisitsCard } from './PastVisitsCard';
import { TodayVisitCard } from './TodayVisitCard';

const Layout = styled.div`
	display: grid;
	gap: 16px;
	max-width: 640px;

	.message {
		display: grid;
		justify-items: start;
		gap: 12px;
		margin: 0;
		padding: 12px 0;
		color: var(--color-text-muted);
		font-size: 14px;
	}
`;

export type GuestProfileViewProps = {
	/** The guest the route names. */
	guestId: string;
	onBack: () => void;
};

/**
 * The guest database's subview: one guest's profile. Who they are, their record in four numbers,
 * their visit in today's session with the queue's own actions, their household, the visits before
 * today's, and the notes staff keep about them.
 */
export const GuestProfileView = observer(function GuestProfileView({
	guestId,
	onBack,
}: GuestProfileViewProps) {
	const t = adminTranslations.en.guestProfile;
	const { admin, session } = useRootStore();
	const store = admin.guestProfile;
	const profile = store.profile;
	const currentEventId = session.currentState?.event?.id ?? null;

	useEffect(() => {
		void store.load(guestId);

		return () => store.close();
	}, [store, guestId]);

	if (!profile) {
		return (
			<Layout className="guest-profile">
				<BackButton label={t.back} onClick={onBack} />
				{store.loadFailed ? (
					<div className="message" role="alert">
						<p>{t.loadFailed}</p>
						<Button variant="outlined" onClick={() => void store.load(guestId)}>
							{t.retry}
						</Button>
					</div>
				) : (
					<p className="message" role="status">
						{t.loading}
					</p>
				)}
			</Layout>
		);
	}

	const today = profile.visitIn(currentEventId);
	const todayGuest = today ? profile.asQueueGuest(today) : null;

	// The admin store reports a refusal itself; either way the profile rereads what the visit is now.
	async function run(command: VisitCommand) {
		if (todayGuest) {
			await admin.runGuestCommand(todayGuest, command);
			await store.load(guestId);
		}
	}

	return (
		<Layout className="guest-profile">
			<GuestProfileHeader profile={profile} onBack={onBack} />
			<GuestProfileStats profile={profile} />
			{todayGuest ? (
				<TodayVisitCard visit={todayGuest} onRun={(command) => void run(command)} />
			) : null}
			<HouseholdCard profile={profile} />
			<PastVisitsCard visits={profile.pastVisits(currentEventId)} />
			{/* Keyed by guest, so another profile reads its own notes. */}
			<TicketGuestNotes key={profile.guestId} guestId={profile.guestId} />
		</Layout>
	);
});
