import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import type { ReactNode } from 'react';

import { adminFeedbackText } from '../../services/admin-feedback';
import { currentSessionState } from '../../services/sessionStateMachine';
import { useRootStore } from '../../stores/react/store-context';
import { EyebrowLabel } from '../EyebrowLabel';
import type { AdminView } from './types';

/*
 * Reports are the one admin screen meant for a desk: a wide table is easier to read than a narrow
 * one, and the rest of the app has no reason to widen with it.
 */
const Dashboard = styled.section<{ $wide: boolean }>`
	width: min(100% - 32px, ${({ $wide }) => ($wide ? '1600px' : '1180px')});
	margin: 0 auto;
	padding: 30px 0 60px;

	.admin-navigation {
		display: flex;
		gap: 8px;
		margin-bottom: 28px;
		padding-bottom: 4px;
		overflow-x: auto;
	}

	.admin-navigation button {
		flex: 0 0 auto;
		min-height: 44px;
		padding: 0 15px;
		border: 1.5px solid #c7d2cc;
		border-radius: var(--radius-pill);
		color: var(--color-brand);
		background: white;
		font-weight: 700;
		text-transform: capitalize;
	}

	.admin-navigation button.active {
		color: var(--color-on-brand);
		background: var(--color-brand);
		border-color: var(--color-brand);
	}

	.admin-content {
		min-width: 0;
	}

	.admin-heading {
		display: flex;
		flex-wrap: wrap;
		gap: 18px;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 28px;
	}

	.admin-heading h1 {
		color: var(--color-brand);
		margin-bottom: 8px;
	}

	.admin-heading p {
		color: var(--color-text-subtle);
		line-height: 1.5;
	}

	.event-state {
		padding: 9px 13px;
		border-radius: var(--radius-pill);
		background: #e5f4ed;
		color: #145c3c;
		font-size: 13px;
		font-weight: 700;
	}

	.event-state.registration_closed,
	.event-state.lottery_pending,
	.event-state.inactive {
		background: #fff1d8;
		color: #7a4b00;
	}

	.event-state.scheduled {
		background: #e8f0fb;
		color: #254d7a;
	}

	.event-state.service_started {
		background: #e9e7f9;
		color: #39306b;
	}

	.event-state.ended {
		background: #edf0ee;
		color: var(--color-text-subtle);
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

		.admin-navigation {
			position: sticky;
			top: 24px;
			display: grid;
			gap: 8px;
			margin: 0;
			overflow: visible;
		}

		.admin-navigation button {
			width: 100%;
			min-height: 50px;
			border-radius: 12px;
			text-align: start;
		}
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
	const feedback = adminFeedbackText(admin.feedback, t);
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
			<nav className="admin-navigation" aria-label={t.adminTitle}>
				{navigation.map((item) => (
					<button
						key={item.id}
						type="button"
						className={activeView === item.id ? 'active' : undefined}
						aria-current={activeView === item.id ? 'page' : undefined}
						onClick={() => onNavigate(item.id)}
					>
						{item.label}
					</button>
				))}
			</nav>
			{!navigation.length ? (
				<p className="admin-no-access" role="status">
					{t.noAccess}
				</p>
			) : (
				<div className="admin-content">
					{/* Keep queue controls above the fold on a phone. */}
					<header className={`admin-heading${activeView === 'queue' ? ' compact' : ''}`}>
						<div>
							{activeView !== 'queue' ? <EyebrowLabel tone="brand" label={t.adminEyebrow} /> : null}
							<h1>{viewLabels[activeView]}</h1>
							{activeView !== 'queue' ? <p>{t.adminDescription}</p> : null}
						</div>
						{activeView === 'current-session' || activeView === 'queue' ? (
							<span className={`event-state ${sessionState}`}>{sessionStatusLabel}</span>
						) : null}
					</header>
					{feedback ? (
						<p className="admin-feedback" role="status">
							{feedback}
						</p>
					) : null}
					{children}
				</div>
			)}
		</Dashboard>
	);
});
