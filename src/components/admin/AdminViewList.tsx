import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { useRootStore } from '../../stores/react/store-context';
import { adminViewLabels } from './admin-view-labels';
import type { AdminView } from './types';

const Nav = styled.nav`
	display: grid;
	gap: 4px;

	h2 {
		margin: 0;
		padding: 14px 12px 4px;
		color: var(--color-text-subtle);
		font-family: var(--font-body);
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	section:first-of-type > h2 {
		padding-top: 0;
	}

	ul {
		display: grid;
		gap: 2px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* The ungrouped tools trail the list, set apart by a rule rather than a heading. */
	* + .ungrouped {
		margin-top: 10px;
		padding-top: 10px;
		border-top: 1px solid #e2e6e3;
	}

	button {
		display: flex;
		width: 100%;
		min-height: 48px;
		align-items: center;
		padding: 0 12px;
		border: 0;
		border-radius: var(--radius-sm);
		color: var(--color-text);
		background: transparent;
		font: inherit;
		font-size: 16px;
		font-weight: 700;
		text-align: start;
		cursor: pointer;
	}

	button:hover {
		background: var(--color-surface-soft);
	}

	button[aria-current='page'] {
		color: var(--color-on-brand);
		background: var(--color-brand);
	}
`;

export type AdminViewListProps = {
	activeView: AdminView;
	onSelect: (view: AdminView) => void;
	/** Names the navigation landmark. */
	label: string;
};

/**
 * Every screen this worker can open, under the headings that say what each is for. The same list
 * sits in the sidebar on a wide screen and in the view switcher's sheet on a phone.
 *
 * The current screen is marked only when it is one of the worker's own: while permissions are
 * still resolving, or for a screen typed into the URL by hand, nothing is current, which is the
 * honest state.
 */
export const AdminViewList = observer(function AdminViewList({
	activeView,
	onSelect,
	label,
}: AdminViewListProps) {
	const { admin, translations } = useRootStore();
	const t = translations.adminTranslation;
	const { navigation } = admin;
	const current = navigation.includes(activeView) ? activeView : null;

	return (
		<Nav className="admin-navigation" aria-label={label}>
			{navigation.sections.map((section) => {
				const heading =
					navigation.showsHeadings && section.group ? t.viewGroups[section.group] : null;

				return (
					<section
						key={section.group ?? 'ungrouped'}
						className={section.group ? undefined : 'ungrouped'}
					>
						{heading ? <h2>{heading}</h2> : null}
						<ul>
							{section.views.map((view) => (
								<li key={view}>
									<button
										type="button"
										aria-current={view === current ? 'page' : undefined}
										onClick={() => onSelect(view)}
									>
										{adminViewLabels[view]}
									</button>
								</li>
							))}
						</ul>
					</section>
				);
			})}
		</Nav>
	);
});
