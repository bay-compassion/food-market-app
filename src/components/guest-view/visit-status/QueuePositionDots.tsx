import styled from '@emotion/styled';

const defaultPipCount = 7;
const pipSize = 15;
const rowGap = 6;
/** How many of the line's fixed slots the discontinuity mark stands in for once the guest's
 *  position runs past `pipCount`. Its width below is set to exactly what these slots and the
 *  gaps between them would otherwise take, so the row's total footprint never changes between an
 *  ordinary and an abstracted reading. */
const discontinuitySpan = 3;
const discontinuityWidth = discontinuitySpan * pipSize + (discontinuitySpan - 1) * rowGap;

/**
 * `flex-direction: row`'s main axis is logical, not physical, so this mirrors on its own under
 * the `dir="rtl"` set on `<main>` in `App.tsx` — no locale branching needed. The cart is written
 * last, which is deliberate rather than arbitrary: in an LTR document that reads left-to-right
 * with the cart on the right, matching the reading direction as the direction the line moves;
 * under `dir="rtl"` the same markup mirrors so the cart lands on the left, matching a
 * right-to-left reading direction instead.
 */
const Row = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	gap: ${rowGap}px;
`;

const PersonPip = styled.svg`
	width: ${pipSize}px;
	height: ${pipSize}px;
	flex-shrink: 0;
	color: var(--color-border);
	opacity: 0.45;
`;

/** The badge worn by whichever slot `linePosition` currently points at — a person figure most of
 *  the time, or the cart itself once the guest has reached it. Either way the treatment is the
 *  same: larger, brand-colored, and ringed, rather than a bigger version of the plain glyph. */
const EmphasizedBadge = styled.span`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 26px;
	height: 26px;
	flex-shrink: 0;
	border-radius: 50%;
	background: var(--color-brand);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-brand) 18%, transparent);
	color: var(--color-background);

	svg {
		width: 16px;
		height: 16px;
	}
`;

const Discontinuity = styled.span`
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: ${discontinuityWidth}px;
	height: ${pipSize}px;
	flex-shrink: 0;
`;

const DiscontinuityDots = styled.svg`
	position: absolute;
	inset: 0;
	color: var(--color-border);
	opacity: 0.4;
`;

const Cart = styled.svg`
	width: 15px;
	height: 20px;
	flex-shrink: 0;
	color: var(--color-text-muted);
`;

/** The gestalt head-and-shoulders mark shared by every figure in the line, ahead-of-you and you
 *  alike — only size and color tell the two apart. */
function PersonMark() {
	return (
		<>
			<circle cx="12" cy="7" r="4" fill="currentColor" />
			<path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="currentColor" />
		</>
	);
}

/** The cart mark drawn both at its plain size and inside `EmphasizedBadge` once reached — the
 *  same path either way, since only the badge around it changes. */
function CartMark() {
	return (
		<>
			<path
				d="M3 4h2.5l2.3 12a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.55L21 7.5H6.4"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<circle cx="9.5" cy="20" r="1.4" fill="currentColor" />
			<circle cx="17" cy="20" r="1.4" fill="currentColor" />
		</>
	);
}

/**
 * A decorative reading of the guest's spot in line: a fixed row of gestalt figures ending in a
 * shopping cart standing in for the front of the line. `pipCount` (default {@link defaultPipCount})
 * sets how many pip slots the line is drawn with regardless of how far back the guest actually is
 * — the exact count is already the headline number printed next to this row, so this row only
 * needs to place the guest somewhere along a queue-shaped line, not recount it.
 *
 * The cart counts as the line's last slot — `linePosition` addresses it the same way it addresses
 * every pip, counting outward from the cart: `0` is the cart itself, `1` is the pip right next to
 * it, `2` the one after that, and so on. Whichever slot that lands on wears `EmphasizedBadge` —
 * larger, brand-colored, ringed — in place of its plain appearance, whether that slot is a person
 * or the cart.
 *
 * The row never grows past `pipCount` pips. Once `linePosition` runs past it, the slots that
 * would sit behind the guest's figure collapse into a single dotted discontinuity mark, sized to
 * cover exactly the slots it replaces so the row's width stays the same whether or not the count
 * is abstracted. The `linePosition` number itself carries the accessible information elsewhere on
 * the panel, so this whole row is `aria-hidden`.
 */
export function QueuePositionDots({
	linePosition,
	pipCount = defaultPipCount,
}: {
	linePosition: number;
	pipCount?: number;
}) {
	const isBeyondLine = linePosition > pipCount;
	const clampedPosition = Math.min(Math.max(0, linePosition), pipCount);
	const cartIsEmphasized = clampedPosition === 0;
	// Index 0 sits farthest from the cart (the back of the line); index `pipCount - 1` sits right
	// next to it. When the guest has reached the cart, this falls out of the pips' range on
	// purpose — every pip renders plain, and the cart carries the emphasis instead.
	const youIndex = pipCount - clampedPosition;

	const you = (
		<EmphasizedBadge key="you" className="queue-position-you">
			<svg viewBox="0 0 24 24" focusable="false">
				<PersonMark />
			</svg>
		</EmphasizedBadge>
	);
	const pip = (key: number) => (
		<PersonPip key={key} viewBox="0 0 24 24" focusable="false">
			<PersonMark />
		</PersonPip>
	);

	const figures: React.ReactNode[] = isBeyondLine
		? [
				you,
				<Discontinuity key="discontinuity" className="queue-position-discontinuity">
					<DiscontinuityDots viewBox={`0 0 ${discontinuityWidth} ${pipSize}`} focusable="false">
						<circle cx={discontinuityWidth * 0.2} cy={pipSize / 2} r="1.6" fill="currentColor" />
						<circle cx={discontinuityWidth * 0.5} cy={pipSize / 2} r="1.6" fill="currentColor" />
						<circle cx={discontinuityWidth * 0.8} cy={pipSize / 2} r="1.6" fill="currentColor" />
					</DiscontinuityDots>
				</Discontinuity>,
				// Never negative even for a `pipCount` too small to fit the discontinuity mark and a
				// guest figure both — it just leaves no plain pips visible next to the cart.
				...Array.from({ length: Math.max(0, pipCount - 1 - discontinuitySpan) }, (_, index) =>
					pip(index),
				),
			]
		: Array.from({ length: pipCount }, (_, index) => (index === youIndex ? you : pip(index)));

	return (
		<Row className="queue-position-dots" aria-hidden="true">
			{figures}
			{cartIsEmphasized ? (
				<EmphasizedBadge className="queue-position-you">
					<svg viewBox="0 0 24 24" focusable="false">
						<CartMark />
					</svg>
				</EmphasizedBadge>
			) : (
				<Cart viewBox="0 0 24 24" focusable="false">
					<CartMark />
				</Cart>
			)}
		</Row>
	);
}
