import styled from '@emotion/styled';
import { Button, Tab, Tabs } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

import { adminTranslations } from '../../../adminLocales';
import { useRootStore } from '../../../stores/react/store-context';
import { BackButton } from '../BackButton';
import { GuestProfileHeader } from './GuestProfileHeader';
import { GuestProfileOverview } from './GuestProfileOverview';
import { GuestProfileStats } from './GuestProfileStats';
import { GuestProfileVisits } from './GuestProfileVisits';

/** The tabs of a guest's profile, in order. The first is where a profile opens. */
export const guestProfileTabs = ['overview', 'visits'] as const;

export type GuestProfileTab = (typeof guestProfileTabs)[number];

function isGuestProfileTab(value: string | null): value is GuestProfileTab {
	return guestProfileTabs.some((tab) => tab === value);
}

const Layout = styled.div`
	display: grid;
	gap: 16px;
	max-width: 640px;

	.tabs {
		border-bottom: 1px solid var(--color-divider);
	}

	.panel {
		display: grid;
		gap: 16px;
	}

	.message,
	.empty {
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
 * The guest database's subview: one guest's profile. Who they are and their record in four numbers
 * lead, over tabs for the Overview and every visit. The open tab is in the address (`?tab=visits`),
 * so going back from elsewhere returns to it.
 */
export const GuestProfileView = observer(function GuestProfileView({
	guestId,
	onBack,
}: GuestProfileViewProps) {
	const t = adminTranslations.en.guestProfile;
	const store = useRootStore().admin.guestProfile;
	const profile = store.profile;
	const [searchParams, setSearchParams] = useSearchParams();
	const requested = searchParams.get('tab');
	const tab: GuestProfileTab = isGuestProfileTab(requested) ? requested : 'overview';

	useEffect(() => {
		void store.load(guestId);

		return () => store.close();
	}, [store, guestId]);

	function openTab(next: GuestProfileTab) {
		setSearchParams(next === 'overview' ? {} : { tab: next }, { replace: true });
	}

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

	return (
		<Layout className="guest-profile">
			<GuestProfileHeader profile={profile} onBack={onBack} />
			<GuestProfileStats profile={profile} />
			<Tabs
				className="tabs"
				value={tab}
				onChange={(_, next: GuestProfileTab) => openTab(next)}
				aria-label={t.tabsLabel}
				variant="fullWidth"
			>
				<Tab
					value="overview"
					label={t.overviewTab}
					id="guest-profile-tab-overview"
					aria-controls="guest-profile-panel"
				/>
				<Tab
					value="visits"
					label={t.visitsTab}
					id="guest-profile-tab-visits"
					aria-controls="guest-profile-panel"
				/>
			</Tabs>
			<div
				className="panel"
				role="tabpanel"
				id="guest-profile-panel"
				aria-labelledby={`guest-profile-tab-${tab}`}
			>
				{tab === 'overview' ? (
					<GuestProfileOverview profile={profile} onSeeAllVisits={() => openTab('visits')} />
				) : (
					<GuestProfileVisits profile={profile} />
				)}
			</div>
		</Layout>
	);
});
