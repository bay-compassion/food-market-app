import styled from '@emotion/styled';
import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';

/** Points the arrow the way the text reads, so it still leads into or out of the door in RTL. */
const Mirrored = styled(SvgIcon)`
	[dir='rtl'] & {
		transform: scaleX(-1);
	}
`;

/** Material's `Logout` glyph: an arrow leaving a door. */
export function LogoutIcon(props: SvgIconProps) {
	return (
		<Mirrored {...props}>
			<path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
		</Mirrored>
	);
}
