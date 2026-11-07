import styled from '@emotion/styled';
import { IconButton } from '@mui/material';
import type { ReactNode, RefObject } from 'react';
import { useControls } from 'react-zoom-pan-pinch';

import { adminTranslations } from '../../adminLocales';

const Controls = styled.div`
	position: absolute;
	top: 8px;
	inset-inline-end: 8px;
	display: grid;
	gap: 6px;

	.MuiIconButton-root {
		width: 44px;
		height: 44px;
		border: 1px solid var(--color-divider);
		color: var(--color-brand-dark);
		background: var(--color-surface);
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.18);
	}

	.MuiIconButton-root:hover {
		background: var(--color-surface-soft);
	}

	.MuiIconButton-root.Mui-disabled {
		color: var(--color-text-subtle);
		opacity: 0.6;
	}
`;

function Icon({ children }: { children: ReactNode }) {
	return (
		<svg
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{children}
		</svg>
	);
}

export type FloorPlanControlsProps = {
	scale: number;
	maxScale: number;
	/** The area Reset returns to. */
	focusRef: RefObject<HTMLDivElement | null>;
};

/** Zoom in, zoom out, and back to the starting view, laid over the plan's corner. */
export function FloorPlanControls({ scale, maxScale, focusRef }: FloorPlanControlsProps) {
	const t = adminTranslations.en.checklist.floorPlan;
	const { zoomIn, zoomOut, zoomToElement } = useControls();

	return (
		<Controls>
			<IconButton
				aria-label={t.zoomIn}
				disabled={scale >= maxScale - 0.01}
				onClick={() => void zoomIn()}
			>
				<Icon>
					<path d="M12 5v14M5 12h14" />
				</Icon>
			</IconButton>
			<IconButton aria-label={t.zoomOut} disabled={scale <= 1.01} onClick={() => void zoomOut()}>
				<Icon>
					<path d="M5 12h14" />
				</Icon>
			</IconButton>
			<IconButton
				aria-label={t.reset}
				onClick={() => {
					if (focusRef.current) {
						void zoomToElement(focusRef.current);
					}
				}}
			>
				<Icon>
					<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
					<circle cx="12" cy="12" r="2.5" />
				</Icon>
			</IconButton>
		</Controls>
	);
}
