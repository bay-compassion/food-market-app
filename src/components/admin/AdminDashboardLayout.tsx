import styled from '@emotion/styled';
import useMediaQuery from '@mui/material/useMediaQuery';
import { observer } from 'mobx-react-lite';
import { useId, type ReactNode } from 'react';

import { useRootStore } from '../../stores/react/store-context';
import { wideLayoutQuery } from './admin-layout';
import { adminViewLabels } from './admin-view-labels';
import { AdminFeedbackBanner } from './AdminFeedbackBanner';
import { AdminThemeProvider } from './AdminThemeProvider';
import { AdminViewList } from './AdminViewList';
import { AdminViewSwitcher } from './AdminViewSwitcher';
import { GuestClaimDialog } from './GuestClaimDialog';
import { GuestDeletionDialog } from './GuestDeletionDialog';
import { SessionStateChip } from './SessionStateChip';
import type { AdminView } from './types';

/*
 * Reports are the one admin screen meant for a desk: a wide table is easier to read than a narrow
 * one, and the rest of the app has no reason to widen with it.
 */
const Dashboard = styled.section<{ $wide: boolean }>`
	width: min(100% - 32px, ${({ $wide }) => ($wide ? '1600px' : '1180px')});
	margin: 0 auto;
	padding: 12px 0 60px;

	.admin-sidebar {
		position: sticky;
		top: 24px;
	}

	.admin-content {
		min-width: 0;
	}

	/*
	 * The title and the session's status share a line, so the status is read on every screen
	 * without costing one of its own; the screen's content starts right under a one-line summary.
	 */
	.admin-heading {
		display: grid;
		gap: 6px;
		margin-bottom: 20px;
		padding-bottom: 14px;
		border-bottom: 1px solid #e2e6e3;
	}

	.admin-title-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 12px;
		align-items: center;
		justify-content: space-between;
	}

	.admin-heading h1 {
		margin: 0;
		color: var(--color-brand-dark);
		font-size: 24px;
		letter-spacing: normal;
		text-transform: none;
	}

	.admin-heading p {
		color: var(--color-text-subtle);
		font-size: 15px;
		line-height: 1.45;
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

	@media ${wideLayoutQuery} {
		display: grid;
		grid-template-columns: 220px minmax(0, 1fr);
		gap: 42px;
		align-items: start;
		padding-top: 24px;

		.admin-heading h1 {
			font-size: 30px;
		}
	}
`;

/** Shared navigation, title, and feedback around each admin screen. */
export const AdminDashboardLayout = observer(function AdminDashboardLayout({
	activeView,
	onNavigate,
	children,
}: {
	activeView: AdminView;
	onNavigate: (view: AdminView) => void;
	children: ReactNode;
}) {
	const { translations, admin } = useRootStore();
	const t = translations.adminTranslation;
	const isWide = useMediaQuery(wideLayoutQuery);
	const headingId = useId();

	return (
		<AdminThemeProvider>
			<Dashboard className="admin-dashboard" $wide={activeView === 'reports'}>
				{isWide ? (
					<div className="admin-sidebar">
						<AdminViewList activeView={activeView} onSelect={onNavigate} label={t.adminTitle} />
					</div>
				) : null}
				{admin.navigation.isEmpty ? (
					<p className="admin-no-access" role="status">
						{t.noAccess}
					</p>
				) : (
					<section className="admin-content" aria-labelledby={headingId}>
						<header className="admin-heading">
							<div className="admin-title-row">
								{isWide ? (
									<h1 id={headingId}>{adminViewLabels[activeView]}</h1>
								) : (
									<AdminViewSwitcher
										activeView={activeView}
										onNavigate={onNavigate}
										headingId={headingId}
									/>
								)}
								<SessionStateChip />
							</div>
							<p>{t.viewDescriptions[activeView]}</p>
						</header>
						<AdminFeedbackBanner />
						{children}
						{/* Opened from the feedback line after an add, or from any guest's Actions menu. */}
						<GuestClaimDialog />
						<GuestDeletionDialog />
					</section>
				)}
			</Dashboard>
		</AdminThemeProvider>
	);
});
