import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';
import { CheckInStation } from './CheckInStation';
import { ChecklistFloorPlan } from './ChecklistFloorPlan';
import { ChecklistReference } from './ChecklistReference';
import { ChecklistSessionBanner } from './ChecklistSessionBanner';
import { RoomDisplayStation } from './RoomDisplayStation';

const Layout = styled.div`
	display: grid;
	gap: 16px;

	/* The view's own spacing replaces the sections' bottom margins. */
	.admin-section {
		margin-bottom: 0;
	}

	.intro {
		margin: 0;
		color: var(--color-text-muted);
		line-height: 1.5;
	}
`;

export type ChecklistViewProps = {
	onNavigateSchedule: () => void;
};

/**
 * Everything done by hand, outside the app, before a session: whether there is a session at all,
 * where in the building the market is, then its two stations — the room display, and the check-in
 * computer with its label printer — each ticked off step by step on this device. What is needed only
 * when something goes wrong, or on a new computer, comes last.
 */
export function ChecklistView({ onNavigateSchedule }: ChecklistViewProps) {
	const t = adminTranslations.en.checklist;

	return (
		<Layout>
			<p className="intro">{t.intro}</p>
			<ChecklistSessionBanner onNavigateSchedule={onNavigateSchedule} />
			<ChecklistFloorPlan />
			<RoomDisplayStation number={1} />
			<CheckInStation number={2} />
			<ChecklistReference />
		</Layout>
	);
}
