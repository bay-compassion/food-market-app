import styled from '@emotion/styled';
import { useRef, useState } from 'react';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';

import { FloorPlanControls } from './FloorPlanControls';

/** As close as the plan zooms: enough to read its smallest labels on a phone. */
const maxScale = 6;

const Frame = styled.div`
	position: relative;
	overflow: hidden;
	border: 1px solid var(--color-divider);
	border-radius: var(--radius-md);
	/* The plan is drawn on white paper whatever the theme. */
	background: #fff;

	/* The library sizes its wrapper to its content; the frame should set the width instead. */
	.react-transform-wrapper,
	.react-transform-component {
		width: 100%;
	}

	.plan {
		position: relative;
		width: 100%;
	}

	img {
		display: block;
		width: 100%;
		height: auto;
		user-select: none;
		-webkit-user-drag: none;
	}

	.focus {
		position: absolute;
		pointer-events: none;
	}
`;

/** A part of the plan, as fractions of its width and height from its top-left corner. */
export type FloorPlanArea = { x: number; y: number; width: number; height: number };

export type FloorPlanViewerProps = {
	src: string;
	alt: string;
	width: number;
	height: number;
	/** The part of the plan it opens on, and goes back to on Reset. */
	focus: FloorPlanArea;
};

/**
 * A floor plan that pinches, double-taps, and drags to zoom and pan, with buttons over it for doing
 * the same by tap. Dragging only pans once zoomed in past the whole plan: at full view the plan is
 * no wider than the page, so a drag over it scrolls the page as it would anywhere else. The mouse
 * wheel is left to the page for the same reason.
 */
export function FloorPlanViewer({ src, alt, width, height, focus }: FloorPlanViewerProps) {
	const focusRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(1);

	return (
		<TransformWrapper
			minScale={1}
			maxScale={maxScale}
			limitToBounds
			centerZoomedOut
			wheel={{ disabled: true }}
			panning={{ disabled: scale <= 1.01, velocityDisabled: true }}
			doubleClick={{ mode: 'zoomIn', step: 1 }}
			onInit={(ref) => {
				if (focusRef.current) {
					void ref.zoomToElement(focusRef.current, undefined, 0);
				}
			}}
			onTransform={(_, state) => setScale(state.scale)}
		>
			<Frame>
				<TransformComponent>
					<div className="plan">
						<img src={src} alt={alt} width={width} height={height} draggable={false} />
						<div
							ref={focusRef}
							className="focus"
							aria-hidden="true"
							style={{
								left: `${focus.x * 100}%`,
								top: `${focus.y * 100}%`,
								width: `${focus.width * 100}%`,
								height: `${focus.height * 100}%`,
							}}
						/>
					</div>
				</TransformComponent>
				<FloorPlanControls scale={scale} maxScale={maxScale} focusRef={focusRef} />
			</Frame>
		</TransformWrapper>
	);
}
