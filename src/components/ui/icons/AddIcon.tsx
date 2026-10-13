import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';

/** Material's `Add` glyph: a plus sign. */
export function AddIcon(props: SvgIconProps) {
	return (
		<SvgIcon {...props}>
			<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
		</SvgIcon>
	);
}
