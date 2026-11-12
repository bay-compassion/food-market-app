import styled from '@emotion/styled';
import { Button } from '@mui/material';

import { adminTranslations } from '../../adminLocales';
import { CheckInStation } from './CheckInStation';
import { ChecklistFloorPlan } from './ChecklistFloorPlan';
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

	.help {
		display: grid;
		gap: 10px;
		justify-items: start;
	}

	.help p {
		margin: 0;
		color: var(--color-text-muted);
		line-height: 1.5;
	}
`;

export type ChecklistViewProps = {
	onNavigateSchedule: () => void;
	onNavigateHelp: () => void;
};

/**
 * Everything done by hand, outside the app, before a session: whether there is a session at all,
 * where in the building the market is, then its two stations — the check-in computer with its label
 * printer, then the room display, whose keyboard is kept in the check-in cabinet — each ticked off
 * step by step on this device. What is needed only when something goes wrong, or on a new
 * computer, is on the Help screen, which the last section points to.
 */
export function ChecklistView({ onNavigateSchedule, onNavigateHelp }: ChecklistViewProps) {
	const t = adminTranslations.en.checklist;

	return (
		<Layout>
			<p className="intro">{t.intro}</p>
			<ChecklistSessionBanner onNavigateSchedule={onNavigateSchedule} />
			<ChecklistFloorPlan />
			<CheckInStation number={1} />
			<RoomDisplayStation number={2} onOpenHelp={onNavigateHelp} />
			<section className="admin-section help">
				<p>{t.helpPrompt}</p>
				<Button variant="outlined" onClick={onNavigateHelp}>
					{t.openHelp}
				</Button>
			</section>
		</Layout>
	);
}
