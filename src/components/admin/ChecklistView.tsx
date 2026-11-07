import styled from '@emotion/styled';

import { CheckInStep } from './CheckInStep';
import { ChecklistFloorPlan } from './ChecklistFloorPlan';
import { MarketSessionStep } from './MarketSessionStep';
import { RoomDisplayStep } from './RoomDisplayStep';

const Layout = styled.div`
	display: grid;
`;

const Steps = styled.ol`
	display: grid;
	margin: 0;
	padding: 0;
	list-style: none;
`;

export type ChecklistViewProps = {
	onNavigateSchedule: () => void;
};

/**
 * Everything done by hand, outside the app, before a session: where in the building the market is,
 * then the room display, the check-in computer and its label printer, and a look at whether there is
 * a session at all. A reference to
 * work down, not a form; nothing here is ticked off or saved.
 */
export function ChecklistView({ onNavigateSchedule }: ChecklistViewProps) {
	return (
		<Layout>
			<ChecklistFloorPlan />
			<Steps>
				<RoomDisplayStep number={1} />
				<CheckInStep number={2} />
				<MarketSessionStep number={3} onNavigateSchedule={onNavigateSchedule} />
			</Steps>
		</Layout>
	);
}
