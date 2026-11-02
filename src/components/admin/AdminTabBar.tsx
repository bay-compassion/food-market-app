import { css, Global } from '@emotion/react';
import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useId, useState, type ReactNode } from 'react';

import { useRootStore } from '../../stores/react/store-context';
import { BottomSheet } from '../ui/BottomSheet';
import { tabBarHeight } from './admin-layout';
import { adminTabLabel } from './admin-view-labels';
import { AdminViewList } from './AdminViewList';
import type { AdminView } from './types';

/*
 * The bar is fixed, so the page needs room to scroll clear of it, and toasts have to rise above it.
 * These sit outside the dashboard's own tree, and apply only while the bar is on screen.
 */
const clearOfBar = css`
	body {
		padding-bottom: calc(${tabBarHeight}px + env(safe-area-inset-bottom));
	}

	/* Doubled to outrank notistack's own rule, and high enough to clear the Add Guest button too. */
	.notistack-SnackbarContainer.notistack-SnackbarContainer {
		bottom: calc(${tabBarHeight + 80}px + env(safe-area-inset-bottom));
	}
`;

const Bar = styled.nav`
	position: fixed;
	inset-inline: 0;
	bottom: 0;
	z-index: 1100;
	display: grid;
	grid-auto-columns: minmax(0, 1fr);
	grid-auto-flow: column;
	padding-bottom: env(safe-area-inset-bottom);
	border-top: 1px solid var(--color-divider);
	background: var(--color-background);

	button {
		display: flex;
		flex-direction: column;
		min-height: ${tabBarHeight}px;
		align-items: center;
		justify-content: center;
		gap: 2px;
		padding: 0 4px;
		border: 0;
		color: var(--color-text-subtle);
		background: transparent;
		font: inherit;
		font-size: 12px;
		font-weight: 500;
		line-height: 1.2;
		cursor: pointer;
	}

	button[aria-current='page'] {
		color: var(--color-brand);
		font-weight: 700;
	}
`;

const SheetHeading = styled.h2`
	margin: 0 0 14px;
	color: var(--color-brand-dark);
	font-family: var(--font-heading);
	font-size: 20px;
	font-weight: 700;
`;

/** Each tab's picture. A screen that only some roles have as a tab falls back to the list. */
const tabIcons: Partial<Record<AdminView, ReactNode>> = {
	'current-session': (
		<>
			<circle cx="12" cy="12" r="9" />
			<path d="M12 7v5l3 2" />
		</>
	),
	'guest-database': (
		<>
			<circle cx="9" cy="8" r="4" />
			<path d="M2 21c0-4 3-6 7-6s7 2 7 6M16 4a4 4 0 0 1 0 8M18 15c2.5.5 4 2.5 4 6" />
		</>
	),
	'session-history': (
		<>
			<path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
			<path d="M3 3v5h5M12 7v5l3 2" />
		</>
	),
};
const defaultIcon = <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />;

function TabIcon({ children }: { children: ReactNode }) {
	return (
		<svg
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{children}
		</svg>
	);
}

export type AdminTabBarProps = {
	activeView: AdminView;
	onNavigate: (view: AdminView) => void;
};

/**
 * How a worker moves between screens on a phone: a tab for each screen they use mid-market, under
 * the thumb and always in sight, and a sheet for the rest. A wide screen has the sidebar instead.
 *
 * The tab for the current screen is marked only when it is one of the worker's own, like the list
 * it stands in for. More is marked when the current screen is one of those inside it.
 */
export const AdminTabBar = observer(function AdminTabBar({
	activeView,
	onNavigate,
}: AdminTabBarProps) {
	const { admin, translations } = useRootStore();
	const t = translations.adminTranslation;
	const { tabs, overflow } = admin.navigation;
	const [open, setOpen] = useState(false);
	const sheetHeadingId = useId();

	function select(view: AdminView) {
		setOpen(false);
		onNavigate(view);
	}

	return (
		<>
			<Global styles={clearOfBar} />
			<Bar className="admin-tabs" aria-label={t.adminTitle}>
				{tabs.map((view) => (
					<button
						key={view}
						type="button"
						data-view={view}
						aria-current={view === activeView ? 'page' : undefined}
						onClick={() => onNavigate(view)}
					>
						<TabIcon>{tabIcons[view] ?? defaultIcon}</TabIcon>
						{adminTabLabel(view)}
					</button>
				))}
				{overflow.isEmpty ? null : (
					<button
						type="button"
						className="admin-more-tab"
						aria-haspopup="dialog"
						aria-expanded={open}
						aria-current={overflow.includes(activeView) ? 'page' : undefined}
						onClick={() => setOpen(true)}
					>
						<TabIcon>
							<circle cx="5" cy="12" r="1" />
							<circle cx="12" cy="12" r="1" />
							<circle cx="19" cy="12" r="1" />
						</TabIcon>
						{t.moreViews}
					</button>
				)}
			</Bar>
			<BottomSheet
				anchor="bottom"
				open={open}
				onClose={() => setOpen(false)}
				transitionDuration={0}
				slotProps={{
					paper: {
						tabIndex: -1,
						role: 'dialog',
						'aria-modal': true,
						'aria-labelledby': sheetHeadingId,
					},
				}}
			>
				<SheetHeading id={sheetHeadingId}>{t.moreViews}</SheetHeading>
				<AdminViewList
					activeView={activeView}
					onSelect={select}
					label={t.moreViews}
					navigation={overflow}
				/>
			</BottomSheet>
		</>
	);
});
