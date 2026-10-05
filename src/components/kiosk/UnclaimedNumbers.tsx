import styled from '@emotion/styled';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { Bilingual, useKioskLanguages } from './kiosk-languages';

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
		/* Explicit, so a right-to-left second line stays under the English rather than flipping. */
		text-align: left;
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
		flex-direction: column;
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

	/* The language's own digits, under the Western ones. */
	li:not([data-more]) > span + span {
		font-size: 0.55em;
		font-synthesis: weight;
	}

	/* Not a number to come up for, so it must not look like one. */
	li[data-more] {
		text-align: center;
		border: 0.5vmin solid currentcolor;
		background: none;
		color: var(--color-on-brand);
		font-size: clamp(1.25rem, 4.5vmin, 3.5rem);
		font-weight: 600;
	}
`;

export type UnclaimedNumbersProps = {
	/** Most recently called first, so the ones that drop off are the oldest. */
	numbers: number[];
};

/**
 * The numbers called earlier that nobody has come up for, as many as fit, then a "+N more" tile.
 * Shown even when there are none, as an empty panel, so the board's layout never shifts.
 *
 * How many fit depends on the screen, so it is measured rather than fixed: every number is laid
 * out, and while the last tile falls below the list's bottom edge, one more number is folded into
 * the "+N more" tile. That runs in a layout effect, so the shrinking happens before paint and the
 * room never sees an overflowing frame. A new list or a resized panel starts over from showing all;
 * a new language remounts this (the board keys it on the locale), since every tile can change size.
 */
export function UnclaimedNumbers({ numbers }: UnclaimedNumbersProps) {
	const { secondary } = useKioskLanguages();
	const native = secondary?.numerals.hasNativeDigits ? secondary : null;
	const listRef = useRef<HTMLUListElement>(null);
	const [limit, setLimit] = useState(Number.POSITIVE_INFINITY);
	const signature = numbers.join(',');
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
			<h2 id="kiosk-still-waiting">
				<Bilingual text={(copy) => copy.stillWaitingFor} />
			</h2>
			<ul ref={listRef}>
				{numbers.slice(0, shown).map((position) => (
					<li key={position}>
						<span>{position}</span>
						{native ? <span lang={native.locale}>{native.numerals.nativeOf(position)}</span> : null}
					</li>
				))}
				{hidden > 0 ? (
					<li data-more="">
						<Bilingual
							text={(copy, numerals) => copy.moreCount.replace('{count}', numerals.inline(hidden))}
						/>
					</li>
				) : null}
			</ul>
		</Panel>
	);
}
