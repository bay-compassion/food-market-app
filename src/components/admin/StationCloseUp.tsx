import styled from '@emotion/styled';

import { concordFloorPlan } from './ChecklistFloorPlan';

/** How much of the plan a close-up shows, in the plan's units: about a sixth of its width. */
const span = { width: 96, height: 34 };

const Figure = styled.svg`
	display: block;
	width: 100%;
	height: auto;
	border: 1px solid var(--color-divider);
	border-radius: var(--radius-md);
	/* The plan is drawn on white paper whatever the theme. */
	background: #fff;
`;

export type StationCloseUpProps = {
	/** The point to centre on, in the plan's own units. */
	center: { x: number; y: number };
	alt: string;
};

/**
 * The floor plan cropped to one station's numbered mark, so its card shows where it goes without
 * the words having to. An SVG `viewBox` over the plan crops it in the plan's own units, and works
 * as far back as the oldest Safari a worker brings.
 */
export function StationCloseUp({ center, alt }: StationCloseUpProps) {
	const { src, x, y, width, height } = concordFloorPlan;
	const viewBox = [center.x - span.width / 2, center.y - span.height / 2, span.width, span.height];

	return (
		<Figure
			viewBox={viewBox.join(' ')}
			role="img"
			aria-label={alt}
			preserveAspectRatio="xMidYMid slice"
		>
			<image href={src} x={x} y={y} width={width} height={height} />
		</Figure>
	);
}
