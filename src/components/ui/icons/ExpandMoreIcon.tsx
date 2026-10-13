import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';

/** Material's `ExpandMore` glyph: a chevron pointing down. */
export function ExpandMoreIcon(props: SvgIconProps) {
	return (
		<SvgIcon {...props}>
			<path d="M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z" />
		</SvgIcon>
	);
}
