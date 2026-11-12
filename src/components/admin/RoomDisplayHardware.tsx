import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';

const Figure = styled.figure`
	display: grid;
	gap: 10px;
	width: 100%;
	margin: 0;
	padding: 12px;
	box-sizing: border-box;
	border-radius: var(--radius-md);
	background: var(--color-surface-muted);

	svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.outline {
		fill: var(--color-surface);
		stroke: var(--color-text-muted);
		stroke-width: 2;
		stroke-linejoin: round;
	}

	.screen {
		fill: var(--color-brand-dark);
	}

	.metal {
		fill: var(--color-surface-strong);
		stroke: var(--color-text-muted);
		stroke-width: 1.5;
	}

	.port {
		fill: var(--color-text-muted);
	}

	.key {
		fill: var(--color-surface-strong);
	}

	.cord {
		fill: none;
		stroke: var(--color-text-muted);
		stroke-width: 3;
		stroke-linecap: round;
	}

	/* The stand's own power cord: black whatever the theme, since it is black. */
	.mains {
		fill: none;
		stroke: #111;
		stroke-width: 4;
		stroke-linecap: round;
	}

	.plug {
		fill: #111;
	}

	/* The ⏻ on the TV's power button, light on the dark button. */
	.power-symbol {
		fill: none;
		stroke: var(--color-surface);
		stroke-width: 1.6;
		stroke-linecap: round;
	}

	.leader {
		fill: none;
		stroke: var(--color-text-subtle);
		stroke-width: 1.5;
		stroke-dasharray: 4 4;
	}

	/* What to press, ringed in the same orange as the captions' markers. */
	.target {
		fill: none;
		stroke: var(--color-focus);
		stroke-width: 3;
	}

	figcaption {
		display: grid;
		gap: 8px;
		font-size: 14px;
		line-height: 1.45;
	}

	figcaption p {
		display: grid;
		grid-template-columns: 12px minmax(0, 1fr);
		gap: 8px;
		margin: 0;
	}

	figcaption p::before {
		content: '';
		width: 12px;
		height: 12px;
		margin-top: 4px;
		box-sizing: border-box;
		border: 3px solid var(--color-focus);
		border-radius: 50%;
	}
`;

/** The TV's buttons above power, top to bottom: menu, input, volume up and down, channel up and down. */
const tvButtons = [70, 92, 114, 136, 158, 180];

/** The keyboard's rows of keys, as counts across, leaving room on the right for its touchpad. */
const keyRows = [12, 12, 11, 10];

/**
 * Where the room display's three awkward switches are. The TV stands on a rolling stand between two
 * upright posts, and the Mac mini (an Intel model; from 2010 to 2018 the power button is on the
 * back beside the power inlet) is wedged on the bracket behind it, sticking up above the TV. Under the TV is drawn the
 * mini's back panel, ports in order, and below that the Logitech K400 keyboard, whose on/off switch
 * is on the right of its top edge.
 *
 * Right of the TV is drawn the column of buttons on the TV's back, which is along its right edge as
 * you face the screen; power is the bottom of its seven buttons.
 *
 * Which way the mini's back faces depends on how it was wedged in, so the drawing and caption find
 * the button by the power cord rather than by left or right.
 */
export function RoomDisplayHardware() {
	const t = adminTranslations.en.checklist.roomDisplay.hardware;

	return (
		<Figure>
			<svg viewBox="0 0 384 368" role="img" aria-label={t.alt}>
				{/* The stand: two upright tubes behind the TV, running down past it to a wheeled base, so
				    the TV stands well off the floor. */}
				<rect className="metal" x="84" y="252" width="152" height="7" rx="3" />
				<circle className="metal" cx="94" cy="264" r="5" />
				<circle className="metal" cx="226" cy="264" r="5" />
				<rect className="metal" x="116" y="58" width="9" height="196" rx="4" />
				<rect className="metal" x="195" y="58" width="9" height="196" rx="4" />
				{/* The stand's one long black power cord, from the back of the stand near its base. */}
				<path className="mains" d="M204 240 C 240 244, 262 262, 300 268" />
				<rect className="plug" x="300" y="262" width="16" height="12" rx="2" />
				{/* The Mac mini, wedged on the bracket, about two thirds of it above the TV. */}
				<rect className="outline" x="128" y="28" width="64" height="60" rx="9" />
				{/* The TV, in front of both. */}
				<rect className="outline" x="26" y="70" width="268" height="122" rx="5" />
				<rect className="screen" x="33" y="77" width="254" height="108" rx="2" />

				{/* A leader from the mini down to the close-up of its back. */}
				<path className="leader" d="M128 44 H10 V313 H20" />

				{/* A leader from the TV's right edge to the column of buttons on its back. */}
				<path className="leader" d="M294 128 H330" />
				<rect className="outline" x="330" y="56" width="44" height="194" rx="6" />
				{tvButtons.map((y) => (
					<rect key={y} className="port" x="342" y={y} width="20" height="15" rx="3" />
				))}
				<rect className="port" x="341" y="212" width="22" height="20" rx="3" />
				<path className="power-symbol" d="M348.6 219.4 a5 5 0 1 0 6.8 0 M352 216.5 V222.5" />
				<circle className="target" cx="352" cy="222" r="16" />

				{/* The mini's back panel, from the power button end. */}
				<rect className="outline" x="20" y="296" width="280" height="34" rx="8" />
				<circle className="port" cx="42" cy="313" r="7" />
				<circle className="target" cx="42" cy="313" r="12" />
				<rect className="port" x="62" y="305" width="20" height="16" rx="4" />
				<path className="cord" d="M72 321 V360" />
				<rect className="port" x="96" y="307" width="18" height="13" rx="2" />
				<rect className="port" x="124" y="310" width="12" height="6" rx="3" />
				<rect className="port" x="142" y="310" width="12" height="6" rx="3" />
				<rect className="port" x="160" y="310" width="12" height="6" rx="3" />
				<rect className="port" x="178" y="310" width="12" height="6" rx="3" />
				<rect className="port" x="200" y="309" width="20" height="8" rx="2" />
				<rect className="port" x="230" y="309" width="16" height="8" rx="1" />
				<rect className="port" x="252" y="309" width="16" height="8" rx="1" />
				<circle className="port" cx="282" cy="313" r="4" />
			</svg>
			<svg viewBox="0 0 320 124" aria-hidden="true">
				<rect className="outline" x="8" y="22" width="304" height="94" rx="12" />
				{keyRows.map((count, row) =>
					Array.from({ length: count }, (_, index) => (
						<rect
							key={`${row}-${index}`}
							className="key"
							x={20 + index * 17 + row * 4}
							y={34 + row * 18}
							width="14"
							height="14"
							rx="2"
						/>
					)),
				)}
				<rect className="key" x="238" y="34" width="62" height="70" rx="6" />
				{/* The on/off switch, on the right of the top edge. */}
				<rect className="port" x="268" y="16" width="20" height="7" rx="3" />
				<ellipse className="target" cx="278" cy="19" rx="18" ry="11" />
			</svg>
			<figcaption>
				<p>{t.tv}</p>
				<p>{t.macMini}</p>
				<p>{t.keyboard}</p>
			</figcaption>
		</Figure>
	);
}
