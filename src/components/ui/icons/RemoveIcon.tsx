import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';

/** Material's `Remove` glyph: a dash. */
export function RemoveIcon(props: SvgIconProps) {
	return (
		<SvgIcon {...props}>
			<path d="M19 13H5v-2h14v2z" />
		</SvgIcon>
	);
}
