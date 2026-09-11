import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useId, type ReactNode } from 'react';

import { currentSessionState } from '../../services/sessionStateMachine';
import { useRootStore } from '../../stores/react/store-context';
import { AdminDashboardTabs } from './AdminDashboardTabs';
import { AdminFeedbackBanner } from './AdminFeedbackBanner';
import { GuestClaimDialog } from './GuestClaimDialog';
import type { AdminView } from './types';

/*
 * Reports are the one admin screen meant for a desk: a wide table is easier to read than a narrow
 * one, and the rest of the app has no reason to widen with it.
 */
const Dashboard = styled.section<{ $wide: boolean }>`
	width: min(100% - 32px, ${({ $wide }) => ($wide ? '1600px' : '1180px')});
	margin: 0 auto;
	padding: 16px 0 60px;

	.admin-content {
		min-width: 0;
	}

	.admin-heading {
		margin-bottom: 24px;
	}

	.admin-heading h1 {
		color: var(--color-brand);
		margin-bottom: 8px;
	}

	.admin-heading p {
		color: var(--color-text-subtle);
		line-height: 1.5;
	}

	/*
	 * The session's status leads the heading rather than trailing it: on the two screens that show
	 * it, it is the thing a worker opens the dashboard to check, so it is read before the title
	 * rather than found beside it. Solid rather than tinted for the same reason.
	 */
	.event-state {
		display: inline-flex;
		gap: 9px;
		align-items: center;
		margin-bottom: 12px;
		padding: 8px 15px;
		border-radius: var(--radius-pill);
		background: #146c34;
		color: white;
		font-size: 15px;
		font-weight: 700;
		line-height: 1.2;
	}

	/* The status light, which carries the state at a glance before the words are read. */
	.event-state::before {
		content: '';
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: currentColor;
	}

	.event-state.registration_closed,
	.event-state.lottery_pending,
	.event-state.inactive {
		background: #7a4e00;
	}

	.event-state.scheduled {
		background: #254d7a;
	}

	.event-state.service_started {
		background: #39306b;
	}

	.admin-no-access {
		padding: 24px;
		border: 1.5px solid #c7d2cc;
		border-radius: var(--radius-lg);
		color: var(--color-text-subtle);
		line-height: 1.5;
		text-align: center;
	}

	.admin-feedback {
		margin-bottom: 16px;
		padding: 12px 14px;
		border-radius: var(--radius-sm);
		background: #eef5f3;
		color: var(--color-brand);
	}

	@media (min-width: 860px) {
		display: grid;
		grid-template-columns: 210px minmax(0, 1fr);
		gap: 42px;
		align-items: start;
	}
`;

/** Shared navigation and feedback around each admin screen. */
export const AdminDashboardLayout = observer(function AdminDashboardLayout({
	activeView,
	onNavigate,
	children,
}: {
	activeView: AdminView;
	onNavigate: (view: AdminView) => void;
	children: ReactNode;
}) {
	const { translations, admin, session } = useRootStore();
	const t = translations.adminTranslation;
	const viewLabels: Record<AdminView, string> = {
		'current-session': t.currentSession,
		queue: t.queue,
		broadcast: t.broadcastTitle,
		'question-bank': t.questionBank,
		'guest-database': t.guestDatabase,
		'session-history': t.historySessions,
		reports: t.reports,
		'dev-mode': t.devMode,
	};
	const navigation = admin.views.map((id) => ({ id, label: viewLabels[id] }));
	const idPrefix = useId();
	const idFor = (view: AdminView) => ({
		tab: `${idPrefix}-${view}-tab`,
		panel: `${idPrefix}-${view}-panel`,
	});
	const sessionState = currentSessionState(session.currentState?.event?.status);
	const sessionStatusLabel = {
		scheduled: t.scheduled,
		registration_open: t.open,
		registration_closed: t.closed,
		lottery_pending: t.lotteryPending,
		service_started: t.serviceStarted,
		inactive: t.noActiveSession,
	}[sessionState];

	return (
		<Dashboard className="admin-dashboard" $wide={activeView === 'reports'}>
			<AdminDashboardTabs
				items={navigation}
				value={activeView}
				idFor={idFor}
				onChange={onNavigate}
				label={t.adminTitle}
			/>
			{!navigation.length ? (
				<p className="admin-no-access" role="status">
					{t.noAccess}
				</p>
			) : (
				<div
					className="admin-content"
					role="tabpanel"
					id={idFor(activeView).panel}
					aria-labelledby={idFor(activeView).tab}
				>
					{/* Keep queue controls above the fold on a phone. */}
					<header className="admin-heading">
						{activeView === 'current-session' || activeView === 'queue' ? (
							<span className={`event-state ${sessionState}`}>{sessionStatusLabel}</span>
						) : null}
						<h1>{viewLabels[activeView]}</h1>
						{activeView !== 'queue' ? <p>{t.adminDescription}</p> : null}
					</header>
					<AdminFeedbackBanner />
					{children}
					{/* Opened from the feedback line after an add, or from any guest's Actions menu. */}
					<GuestClaimDialog />
				</div>
			)}
		</Dashboard>
	);
});
