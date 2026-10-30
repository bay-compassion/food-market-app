import styled from '@emotion/styled';
import type { ReactNode } from 'react';

/**
 * How a status card is painted, by what it tells the guest: `brand` for where they stand, `action`
 * for good news or their turn, `warning` for something that went wrong or needs them now, `muted`
 * for an outcome with nothing left to do today.
 */
export type GuestStatusTone = 'brand' | 'action' | 'warning' | 'muted';

/** The panel's ground, the symbol's fill, and the headline's colour, per tone — each a token. */
const tones: Record<GuestStatusTone, { surface: string; accent: string; strong: string }> = {
	brand: {
		surface: 'var(--color-surface-soft)',
		accent: 'var(--color-brand)',
		strong: 'var(--color-brand-dark)',
	},
	action: {
		surface: 'var(--color-success-surface)',
		accent: 'var(--color-success)',
		strong: 'var(--color-success)',
	},
	warning: {
		surface: 'var(--color-warning-surface)',
		accent: 'var(--color-warning)',
		strong: 'var(--color-warning)',
	},
	muted: {
		surface: 'var(--color-surface-muted)',
		accent: 'var(--color-text-subtle)',
		strong: 'var(--color-text)',
	},
};

/*
 * The tone's colours are custom properties, so the pieces inside — the headline, a number board's
 * card, the ticket stamp — read them without being told the tone. Pieces that need a ground of their
 * own inside the tinted panel take `--color-background`, which is white in light mode and the page's
 * near-black in dark.
 */
const Panel = styled.section<{ $tone: GuestStatusTone }>`
	--status-accent: ${({ $tone }) => tones[$tone].accent};
	--status-strong: ${({ $tone }) => tones[$tone].strong};
	--standing-card-background: var(--color-background);

	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: 12px;
	justify-items: start;
	padding: 20px;
	border-radius: var(--radius-md);
	background: ${({ $tone }) => tones[$tone].surface};

	h2 {
		margin: 0;
		color: var(--color-text-muted);
		font-family: var(--font-heading);
		font-size: 15px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
`;

const Masthead = styled.div`
	display: flex;
	align-items: center;
	gap: 12px;
`;

const Symbol = styled.span<{ $mirrored: boolean }>`
	display: grid;
	width: 40px;
	height: 40px;
	flex-shrink: 0;
	place-items: center;
	border-radius: 50%;
	color: var(--color-background);
	background: var(--status-accent);

	${({ $mirrored }) => ($mirrored ? `[dir='rtl'] & svg { transform: scaleX(-1); }` : '')}
`;

/** The one fact the card exists to tell, under its masthead: "Come to Check-In Now". */
export const StatusHeadline = styled.p`
	color: var(--status-strong);
	font-family: var(--font-heading);
	font-size: 30px;
	font-weight: 700;
	line-height: 1.1;
`;

/** The sentence or two explaining the headline. */
export const StatusBody = styled.p`
	color: var(--color-text-muted);
	line-height: 1.5;
`;

/** Full width and stacked, so buttons line up whatever their labels' lengths. */
export const StatusActions = styled.div`
	display: grid;
	gap: 8px;
	justify-self: stretch;
	margin-top: 4px;
`;

export type GuestStatusPanelProps = {
	tone: GuestStatusTone;
	icon: ReactNode;
	/** The masthead: which state this is, in a few words. */
	heading: string;
	children?: ReactNode;
	/** Mirror the icon in a right-to-left language, for one that points somewhere. */
	mirrorIcon?: boolean;
	className?: string;
};

/**
 * The card every market and visit status on the home screen sits in: a tinted panel under a
 * masthead of symbol and heading, with whatever that status says beneath. A polite live region, so a
 * screen reader hears the card change as the status does; anything long and static belongs after
 * it, not in it.
 */
export function GuestStatusPanel({
	tone,
	icon,
	heading,
	children,
	mirrorIcon = false,
	className,
}: GuestStatusPanelProps) {
	return (
		<Panel
			className={['status-panel', className].filter(Boolean).join(' ')}
			$tone={tone}
			data-tone={tone}
			aria-live="polite"
		>
			<Masthead>
				<Symbol aria-hidden="true" $mirrored={mirrorIcon}>
					{icon}
				</Symbol>
				<h2>{heading}</h2>
			</Masthead>
			{children}
		</Panel>
	);
}
