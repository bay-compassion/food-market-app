import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';

/** Material's `Contrast` glyph: a circle half light, half dark, for the colour mode. */
export function ContrastIcon(props: SvgIconProps) {
	return (
		<SvgIcon {...props}>
			<path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm1-17.93c3.94.49 7 3.86 7 7.93s-3.06 7.44-7 7.93V4.07z" />
		</SvgIcon>
	);
}
