import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';

/** Material's `PriorityHigh` glyph: an exclamation mark. */
export function PriorityHighIcon(props: SvgIconProps) {
	return (
		<SvgIcon {...props}>
			<circle cx="12" cy="19" r="2" />
			<path d="M10 3h4v12h-4z" />
		</SvgIcon>
	);
}
