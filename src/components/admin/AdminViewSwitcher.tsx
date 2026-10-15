import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useId, useState } from 'react';

import { useRootStore } from '../../stores/react/store-context';
import { BottomSheet } from '../ui/BottomSheet';
import { adminViewLabels } from './admin-view-labels';
import { AdminViewList } from './AdminViewList';
import type { AdminView } from './types';

const Title = styled.h1`
	margin: 0;
	min-width: 0;

	button {
		display: inline-flex;
		max-width: 100%;
		min-height: 44px;
		align-items: center;
		gap: 8px;
		padding: 0;
		border: 0;
		color: var(--color-brand-dark);
		background: transparent;
		font: inherit;
		text-align: start;
		cursor: pointer;
	}

	svg {
		flex-shrink: 0;
	}
`;

const SheetHeading = styled.h2`
	margin: 0 0 14px;
	color: var(--color-brand-dark);
	font-family: var(--font-heading);
	font-size: 20px;
	font-weight: 700;
`;

export type AdminViewSwitcherProps = {
	activeView: AdminView;
	onNavigate: (view: AdminView) => void;
	/** The heading's id, which the screen's content region is labelled by. */
	headingId: string;
};

/**
 * The screen's title on a phone, which is also how a worker moves to another screen: tapping it
 * raises a sheet listing every screen they can open. Nine screens in a sideways strip left most
 * of them out of sight; a sheet shows them all, grouped, under the thumb.
 *
 * The title stays the page's only `h1`, with the button inside it, so a screen reader still hears
 * the screen's name as its heading. Picking a screen closes the sheet, and the sheet hands focus
 * back to the title as it closes.
 */
export const AdminViewSwitcher = observer(function AdminViewSwitcher({
	activeView,
	onNavigate,
	headingId,
}: AdminViewSwitcherProps) {
	const { translations } = useRootStore();
	const t = translations.adminTranslation;
	const [open, setOpen] = useState(false);
	const sheetHeadingId = useId();

	function select(view: AdminView) {
		setOpen(false);
		onNavigate(view);
	}

	return (
		<>
			<Title id={headingId}>
				<button
					type="button"
					aria-haspopup="dialog"
					aria-expanded={open}
					onClick={() => setOpen(true)}
				>
					{adminViewLabels[activeView]}
					<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
						<path
							d="M6 9l6 6 6-6"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.6"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</button>
			</Title>
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
				<SheetHeading id={sheetHeadingId}>{t.switchView}</SheetHeading>
				<AdminViewList activeView={activeView} onSelect={select} label={t.adminTitle} />
			</BottomSheet>
		</>
	);
});
