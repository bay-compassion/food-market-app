import styled from '@emotion/styled';

import { useNow } from '../hooks/use-now';

/* Hours and minutes in the display's own time zone — the room it hangs in. English, like every
   primary line on the display; the digits are Western, which every guest reads. */
const format = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

const Time = styled.time`
	font-size: 1.6em;
	font-weight: 600;
	line-height: 1;
	white-space: nowrap;
	font-variant-numeric: tabular-nums;
`;

/**
 * The time of day, for a room of people waiting on the market's schedule.
 *
 * Its own component so only the clock re-renders on each tick, not the board and its fitted tiles.
 * It ticks every second so the minute turns over on time, though it shows no seconds.
 */
export function KioskClock() {
	const now = new Date(useNow(1_000));

	return <Time dateTime={now.toISOString()}>{format.format(now)}</Time>;
}
