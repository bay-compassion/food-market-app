import styled from '@emotion/styled';
import type { CSSProperties } from 'react';

import { guestStates, type GuestStateKey } from './guest-states';

const Pip = styled.span`
	display: inline-block;
	width: 0.6em;
	height: 0.6em;
	margin-inline-end: 0.5em;
	border-radius: 50%;
	background: var(--state-color);
	/* Sits on the heading's baseline rather than floating above it. */
	vertical-align: 0.05em;
`;

/**
 * A dot in a state's color, for the front of a section heading so it can be matched to its node in
 * the flowchart. Decorative: the heading beside it names the state, so the color is never the only
 * thing telling a reader which one this is.
 */
export function StatePip({ state }: { state: GuestStateKey }) {
	return (
		<Pip
			aria-hidden="true"
			style={{ '--state-color': guestStates[state].color } as CSSProperties}
		/>
	);
}
