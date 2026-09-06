import Tab from '@mui/material/Tab';
import Tabs, { tabsClasses } from '@mui/material/Tabs';
import useMediaQuery from '@mui/material/useMediaQuery';

import type { AdminView } from './types';

export type AdminDashboardTab = {
	id: AdminView;
	label: string;
};

/**
 * The width at which the dashboard becomes a two-column grid and the tab strip moves into the
 * sidebar. Kept in step with the `@media (min-width: 860px)` block in `AdminDashboardLayout`.
 */
const wideLayoutQuery = '(min-width: 860px)';

export type AdminDashboardTabsProps = {
	items: AdminDashboardTab[];
	value: AdminView;
	/** Identifies the panel each tab controls, so the ids match the ones the layout renders. */
	idFor: (view: AdminView) => { tab: string; panel: string };
	onChange: (view: AdminView) => void;
	label: string;
};

/**
 * The admin screen picker: a scrolling strip of pills on a phone, a stacked sidebar once there is
 * room for one.
 *
 * The selected screen is marked by filling its pill rather than by MUI's indicator bar, which is
 * why the indicator is hidden — the fill is the treatment the rest of the dashboard already uses.
 *
 * `value` is `false` while the screen a route asked for is not one this worker may open: during
 * the first render, before permissions resolve, and for a URL typed by hand. MUI logs an error for
 * a value matching no tab, and no tab selected is the honest state anyway.
 */
export function AdminDashboardTabs({
	items,
	value,
	idFor,
	onChange,
	label,
}: AdminDashboardTabsProps) {
	const isWide = useMediaQuery(wideLayoutQuery);
	const selected = items.some((item) => item.id === value) ? value : false;

	return (
		<Tabs
			className="admin-navigation"
			aria-label={label}
			orientation={isWide ? 'vertical' : 'horizontal'}
			variant="scrollable"
			// A scroll button is a `button` in the strip that is not a screen, and it would be
			// keyboard-reachable ahead of the tabs. The strip swipes on a phone instead.
			scrollButtons={false}
			value={selected}
			onChange={(_event, next: AdminView) => onChange(next)}
			sx={{
				width: '100%',
				minHeight: 0,
				marginBottom: isWide ? 0 : '28px',
				position: isWide ? 'sticky' : undefined,
				top: isWide ? 24 : undefined,
				[`& .${tabsClasses.list}`]: { gap: '8px', paddingBottom: isWide ? 0 : '4px' },
				[`& .${tabsClasses.indicator}`]: { display: 'none' },
			}}
		>
			{items.map((item) => {
				const ids = idFor(item.id);

				return (
					<Tab
						key={item.id}
						id={ids.tab}
						// Only one panel is mounted at a time, so only the selected tab has one to point
						// at. On the rest the attribute would reference an element that is not there.
						aria-controls={item.id === selected ? ids.panel : undefined}
						value={item.id}
						label={item.label}
						disableRipple
						sx={{
							flex: '0 0 auto',
							minWidth: 0,
							minHeight: isWide ? 50 : 44,
							width: isWide ? '100%' : undefined,
							paddingInline: '15px',
							alignItems: isWide ? 'flex-start' : 'center',
							textAlign: 'start',
							border: '1.5px solid #c7d2cc',
							borderRadius: isWide ? '12px' : 'var(--radius-pill)',
							color: 'var(--color-brand)',
							background: 'white',
							fontWeight: 700,
							textTransform: 'capitalize',
							'&.Mui-selected': {
								color: 'var(--color-on-brand)',
								background: 'var(--color-brand)',
								borderColor: 'var(--color-brand)',
							},
						}}
					/>
				);
			})}
		</Tabs>
	);
}
