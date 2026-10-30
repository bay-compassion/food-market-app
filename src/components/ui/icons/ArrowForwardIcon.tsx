import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';

/** Material's `ArrowForward` glyph. It points right, so mirror it under `dir="rtl"`. */
export function ArrowForwardIcon(props: SvgIconProps) {
	return (
		<SvgIcon {...props}>
			<path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
		</SvgIcon>
	);
}
