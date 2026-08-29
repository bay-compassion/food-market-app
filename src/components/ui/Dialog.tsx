import styled from '@emotion/styled';
import {
	useEffect,
	useId,
	useRef,
	type MouseEvent,
	type ReactNode,
	type SyntheticEvent,
} from 'react';

export type DialogProps = {
	open: boolean;
	title: string;
	closeLabel: string;
	onClose: () => void;
	children: ReactNode;
	/** Buttons for the footer. The footer is not rendered at all when there are none. */
	actions?: ReactNode;
};

const Modal = styled.dialog`
	width: min(100% - 32px, 480px);
	max-height: calc(100dvh - 32px);
	padding: 0;
	overflow: hidden;
	border: 0;
	border-radius: var(--radius-lg);
	color: var(--color-text);
	background: var(--color-background);
	box-shadow: 0 18px 60px rgb(1 42 47 / 24%);

	&::backdrop {
		background: rgb(1 42 47 / 62%);
	}
`;

const Panel = styled.section`
	display: flex;
	max-height: calc(100dvh - 32px);
	flex-direction: column;
`;

const Header = styled.header`
	display: flex;
	align-items: flex-start;
	gap: 16px;
	padding: 22px 22px 16px;
	border-bottom: 1px solid var(--color-border);

	h2 {
		flex: 1;
		margin: 0;
		font-family: var(--font-heading);
		font-size: 24px;
		line-height: 1.15;
	}
`;

const CloseButton = styled.button`
	display: grid;
	width: 44px;
	height: 44px;
	margin: -10px -10px -10px 0;
	padding: 10px;
	place-items: center;
	border: 0;
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

const Content = styled.div`
	padding: 22px;
	overflow-y: auto;
`;

const Actions = styled.footer`
	display: flex;
	justify-content: flex-end;
	gap: 12px;
	padding: 16px 22px 22px;
`;

/**
 * A modal built on the native `<dialog>` element, so the browser supplies the backdrop, focus
 * trapping, and Escape handling rather than this reimplementing them.
 *
 * `showModal()` has to be called imperatively — an unopened `<dialog>` in the DOM is inert, and the
 * `open` attribute alone opens it *non*-modally, without the backdrop or the focus trap. The effect
 * below is what makes the `open` prop mean what it looks like it means.
 */
export function Dialog({ open, title, closeLabel, onClose, children, actions }: DialogProps) {
	const dialog = useRef<HTMLDialogElement>(null);
	const titleId = `dialog-title-${useId()}`;

	useEffect(() => {
		const element = dialog.current;

		if (open && element && !element.open) {
			element.showModal();
		}
	}, [open]);

	if (!open) {
		return null;
	}

	/** A click that lands on the element itself, not its panel, is a click on the backdrop. */
	function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	// Escape fires `cancel`; preventing the default keeps the close going through `onClose` rather
	// than the browser closing the element behind React's back and leaving `open` true.
	function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
		event.preventDefault();
		onClose();
	}

	return (
		<Modal
			ref={dialog}
			className="dialog"
			aria-labelledby={titleId}
			onCancel={handleCancel}
			onClick={handleBackdropClick}
		>
			<Panel className="dialog-panel">
				<Header className="dialog-header">
					<h2 id={titleId}>{title}</h2>
					<CloseButton
						className="dialog-close"
						type="button"
						aria-label={closeLabel}
						onClick={onClose}
					>
						<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
							<path d="m6 6 12 12M18 6 6 18" />
						</svg>
					</CloseButton>
				</Header>
				<Content className="dialog-content">{children}</Content>
				{actions ? <Actions className="dialog-actions">{actions}</Actions> : null}
			</Panel>
		</Modal>
	);
}
