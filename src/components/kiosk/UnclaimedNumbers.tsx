import styled from '@emotion/styled';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const Panel = styled.section`
	display: flex;
	flex-direction: column;
	gap: 3vmin;
	min-height: 0;
	padding: 4vmin;
	border-radius: var(--radius-lg);
	background: rgb(255 255 255 / 8%);
	overflow: hidden;

	h2 {
		margin: 0;
		font-size: clamp(1.5rem, 4.5vmin, 3.5rem);
		font-weight: 600;
		line-height: 1.2;
	}

	ul {
		position: relative;
		display: flex;
		flex: 1;
		flex-wrap: wrap;
		align-content: flex-start;
		gap: 2.5vmin;
		min-height: 0;
		margin: 0;
		padding: 0;
		overflow: hidden;
		list-style: none;
	}

	li {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 2.6ch;
		padding: 1vmin 2.5vmin;
		border-radius: var(--radius-md);
		background: var(--color-focus);
		color: var(--color-brand-dark);
		font-size: clamp(2.5rem, 10vmin, 8rem);
		font-weight: 700;
		line-height: 1.1;
		font-variant-numeric: tabular-nums;
	}

	/* Not a number to come up for, so it must not look like one. */
	li[data-more] {
		border: 0.5vmin solid currentcolor;
		background: none;
		color: var(--color-on-brand);
		font-size: clamp(1.25rem, 4.5vmin, 3.5rem);
		font-weight: 600;
	}
`;

export type UnclaimedNumbersProps = {
	heading: string;
	/** Most recently called first, so the ones that drop off are the oldest. */
	numbers: number[];
	/** Labels the tile standing in for the numbers that don't fit; `{count}` is how many. */
	moreLabel: string;
};

/**
 * The numbers called earlier that nobody has come up for, as many as fit, then a "+N more" tile.
 *
 * How many fit depends on the screen, so it is measured rather than fixed: every number is laid
 * out, and while the last tile falls below the list's bottom edge, one more number is folded into
 * the "+N more" tile. That runs in a layout effect, so the shrinking happens before paint and the
 * room never sees an overflowing frame. A new list, a new language, or a resized panel starts over
 * from showing all.
 */
export function UnclaimedNumbers({ heading, numbers, moreLabel }: UnclaimedNumbersProps) {
	const listRef = useRef<HTMLUListElement>(null);
	const [limit, setLimit] = useState(Number.POSITIVE_INFINITY);
	// The label is part of it: the display's language rotates, and a longer "+N more" may no longer fit.
	const signature = `${numbers.join(',')}|${moreLabel}`;
	const [measuredSignature, setMeasuredSignature] = useState(signature);

	if (measuredSignature !== signature) {
		setMeasuredSignature(signature);
		setLimit(Number.POSITIVE_INFINITY);
	}

	const shown = Math.min(limit, numbers.length);
	const hidden = numbers.length - shown;

	useLayoutEffect(() => {
		const list = listRef.current;
		const last = list?.lastElementChild;

		if (list && last instanceof HTMLElement && shown > 0) {
			if (last.offsetTop + last.offsetHeight > list.clientHeight) {
				setLimit(shown - 1);
			}
		}
	});

	useEffect(() => {
		const list = listRef.current;

		if (!list || typeof ResizeObserver === 'undefined') {
			return;
		}
		const observer = new ResizeObserver(() => setLimit(Number.POSITIVE_INFINITY));

		observer.observe(list);

		return () => observer.disconnect();
	}, []);

	return (
		<Panel aria-labelledby="kiosk-still-waiting">
			<h2 id="kiosk-still-waiting" dir="auto">
				{heading}
			</h2>
			<ul ref={listRef}>
				{numbers.slice(0, shown).map((position) => (
					<li key={position}>{position}</li>
				))}
				{hidden > 0 ? (
					<li data-more="" dir="auto">
						{moreLabel.replace('{count}', String(hidden))}
					</li>
				) : null}
			</ul>
		</Panel>
	);
}
