import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';

/** Material's `Check` glyph: a tick. */
export function CheckIcon(props: SvgIconProps) {
	return (
		<SvgIcon {...props}>
			<path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
		</SvgIcon>
	);
}
