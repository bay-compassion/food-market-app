import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { type RefObject, useLayoutEffect, useState } from 'react';

import type { SaturdayClockPosition } from '../../models/saturday-clock';
import { useRootStore } from '../../stores/react/store-context';

const Trail = styled.span`
	position: absolute;
	z-index: 1;
	width: 2px;
	background: var(--color-brand);
	pointer-events: none;
	transform: translateX(-50%);

	@media (prefers-reduced-motion: no-preference) {
		transition: height 250ms ease;
	}
`;

const Cursor = styled.span`
	position: absolute;
	z-index: 3;
	width: 18px;
	height: 18px;
	box-sizing: border-box;
	border: 3px solid var(--color-background);
	border-radius: 50%;
	background: var(--color-brand);
	box-shadow: 0 0 0 4px var(--color-surface-soft);
	pointer-events: none;
	transform: translate(-50%, -50%);

	@media (prefers-reduced-motion: no-preference) {
		transition: top 250ms ease;
	}
`;

type Anchor = { x: number; y: number };

/** Measure the rendered rails, so translated text, skipped events, and RTL keep the dot on track. */
export const SaturdayTimeIndicator = observer(function SaturdayTimeIndicator({
	list,
	position,
}: {
	list: RefObject<HTMLOListElement | null>;
	position: SaturdayClockPosition;
}) {
	const { translations } = useRootStore();
	const [anchors, setAnchors] = useState<Anchor[]>([]);
	const locale = translations.locale;

	useLayoutEffect(() => {
		const element = list.current;

		if (!element) {
			return;
		}

		const rails = [...element.querySelectorAll<HTMLElement>('[data-timeline-anchor]')];
		const measure = () => {
			const bounds = element.getBoundingClientRect();

			setAnchors(
				rails.map((rail) => {
					const box = rail.getBoundingClientRect();

					// Both the ordinary and the ringed step dots have their center 10px below the row.
					return { x: box.left + box.width / 2 - bounds.left, y: box.top + 10 - bounds.top };
				}),
			);
		};
		const observer = new ResizeObserver(measure);

		observer.observe(element);
		rails.forEach((rail) => observer.observe(rail));
		measure();

		return () => observer.disconnect();
	}, [list, locale]);

	const start = anchors[position.fromStep];
	const end = anchors[position.toStep];
	const first = anchors[0];

	if (!start || !end || !first) {
		return null;
	}

	const top = start.y + (end.y - start.y) * position.fraction;

	return (
		<>
			<Trail aria-hidden="true" style={{ left: start.x, top: first.y, height: top - first.y }} />
			<Cursor data-timeline-cursor aria-hidden="true" style={{ left: start.x, top }} />
		</>
	);
});
