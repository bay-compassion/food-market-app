import styled from '@emotion/styled';

import { CheckInStep } from './CheckInStep';
import { MarketSessionStep } from './MarketSessionStep';
import { RoomDisplayStep } from './RoomDisplayStep';

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
 * Everything done by hand, outside the app, before a session: the room display, the check-in
 * computer and its label printer, and a look at whether there is a session at all. A reference to
 * work down, not a form; nothing here is ticked off or saved.
 */
export function ChecklistView({ onNavigateSchedule }: ChecklistViewProps) {
	return (
		<Steps>
			<RoomDisplayStep number={1} />
			<CheckInStep number={2} />
			<MarketSessionStep number={3} onNavigateSchedule={onNavigateSchedule} />
		</Steps>
	);
}
