import styled from '@emotion/styled';
import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';

/** Points the arrow the way the text reads, so it still leads into or out of the door in RTL. */
const Mirrored = styled(SvgIcon)`
	[dir='rtl'] & {
		transform: scaleX(-1);
	}
`;

/** Material's `Login` glyph: an arrow entering a door. */
export function LoginIcon(props: SvgIconProps) {
	return (
		<Mirrored {...props}>
			<path d="M11 7 9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z" />
		</Mirrored>
	);
}
