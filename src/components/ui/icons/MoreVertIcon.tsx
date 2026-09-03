import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';

export function MoreVertIcon(props: SvgIconProps) {
	return (
		<SvgIcon {...props}>
			<circle cx="12" cy="5" r="2" />
			<circle cx="12" cy="12" r="2" />
			<circle cx="12" cy="19" r="2" />
		</SvgIcon>
	);
}
