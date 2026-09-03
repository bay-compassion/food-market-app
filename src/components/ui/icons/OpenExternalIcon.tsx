import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';

export function OpenExternalIcon(props: SvgIconProps) {
	return (
		<SvgIcon {...props}>
			<path
				d="M14 3h7v7M21 3 11 13M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</SvgIcon>
	);
}
