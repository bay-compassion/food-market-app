import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';

/** Material's `ChevronRight` glyph: a menu item that opens a submenu. */
export function ChevronRightIcon(props: SvgIconProps) {
	return (
		<SvgIcon {...props}>
			<path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
		</SvgIcon>
	);
}
