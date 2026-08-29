import styled from '@emotion/styled';
import {
	Dialog as MuiDialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	IconButton,
} from '@mui/material';
import { useId, type ReactNode } from 'react';

export type DialogProps = {
	open: boolean;
	title: string;
	closeLabel: string;
	onClose: () => void;
	children: ReactNode;
	/** Buttons for the footer. The footer is not rendered at all when there are none. */
	actions?: ReactNode;
};

const Modal = styled(MuiDialog)`
	.MuiBackdrop-root {
		background: rgb(1 42 47 / 62%);
	}

	.MuiDialog-paper {
		width: min(calc(100% - 32px), 480px);
		max-height: calc(100dvh - 32px);
		margin: 16px;
		overflow: hidden;
		border-radius: var(--radius-lg);
		color: var(--color-text);
		background: var(--color-background);
		box-shadow: 0 18px 60px rgb(1 42 47 / 24%);
	}
`;

const Header = styled.header`
	display: flex;
	align-items: flex-start;
	gap: 16px;
	padding: 22px 22px 16px;
	border-bottom: 1px solid var(--color-border);
`;

const Title = styled(DialogTitle)`
	flex: 1;
	margin: 0;
	padding: 0;
	font-family: var(--font-heading);
	font-size: 24px;
	font-weight: 700;
	line-height: 1.15;
	letter-spacing: normal;
`;

const CloseButton = styled(IconButton)`
	display: grid;
	width: 44px;
	height: 44px;
	margin: -10px -10px -10px 0;
	padding: 10px;
	place-items: center;
	border-radius: var(--radius-pill);
	color: var(--color-brand);
	background: transparent;

	&:hover {
		background: var(--color-surface-soft);
	}

	svg {
		width: 24px;
		height: 24px;
		stroke-width: 2;
	}
`;

const Content = styled(DialogContent)`
	padding: 22px;
	overflow-y: auto;
`;

const Actions = styled(DialogActions)`
	display: flex;
	justify-content: flex-end;
	gap: 12px;
	padding: 16px 22px 22px;
`;

/** A MUI dialog styled to match the app's established modal surface. */
export function Dialog({ open, title, closeLabel, onClose, children, actions }: DialogProps) {
	const titleId = `dialog-title-${useId()}`;

	return (
		<Modal
			open={open}
			className="dialog"
			aria-labelledby={titleId}
			maxWidth={false}
			transitionDuration={0}
			onClose={onClose}
			slotProps={{ paper: { className: 'dialog-panel' } }}
		>
			<Header className="dialog-header">
				<Title id={titleId}>{title}</Title>
				<CloseButton className="dialog-close" aria-label={closeLabel} onClick={onClose}>
					<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path d="m6 6 12 12M18 6 6 18" />
					</svg>
				</CloseButton>
			</Header>
			<Content className="dialog-content">{children}</Content>
			{actions ? (
				<Actions className="dialog-actions" disableSpacing>
					{actions}
				</Actions>
			) : null}
		</Modal>
	);
}
