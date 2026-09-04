import styled from '@emotion/styled';
import { Button } from '@mui/material';

import { DemoPreviewSession } from '../../stores/demo-preview-session';
import { useRootStore } from '../../stores/react/store-context';

const Banner = styled.aside`
	display: flex;

	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 2px 12px;
	min-height: 36px;
	color: var(--color-on-brand);
	background: repeating-linear-gradient(
		-45deg,
		var(--color-brand) 0 10px,
		var(--color-brand-dark) 10px 20px
	);
	font-size: 12px;
	font-weight: 600;

	> span {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.MuiButton-root {
		flex-shrink: 0;
		min-height: 32px;
		padding: 2px 8px;
		color: inherit;
		font-size: 12px;
	}

	.MuiButton-root:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: -2px;
	}
`;

/** Developer controls; the guest content below remains localized normally. */
export default function DemoPreviewBanner() {
	const { previewName } = useRootStore();

	return (
		<Banner aria-label="Demo guest preview" dir="ltr">
			<span title={`Demo guest: ${previewName}`}>Demo guest: {previewName}</span>
			<Button
				size="small"
				onClick={() => {
					new DemoPreviewSession().end();
					window.location.replace('/admin/dev-mode');
				}}
			>
				Exit preview
			</Button>
		</Banner>
	);
}
