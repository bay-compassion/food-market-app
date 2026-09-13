import styled from '@emotion/styled';
import { Button, Drawer } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';

import { useRootStore } from '../../stores/react/store-context';

// The sheet renders in a portal, outside both `.app-shell` and `.admin-dashboard`, so it carries
// its own styles and its own writing direction.
const Sheet = styled(Drawer)`
	.MuiBackdrop-root {
		background: rgb(1 42 47 / 62%);
	}

	.MuiDrawer-paper {
		box-sizing: border-box;
		width: min(100%, 480px);
		max-height: calc(100dvh - 32px);

		/* Anchored bottom, so the paper spans the viewport; this centres it on a wider screen. */
		margin-inline: auto;
		padding: 22px 22px calc(22px + env(safe-area-inset-bottom));
		overflow-y: auto;
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
		color: var(--color-text);
		background: var(--color-background);
		box-shadow: 0 -18px 60px rgb(1 42 47 / 24%);
	}
`;

const Question = styled.h2`
	margin: 0;
	font-family: var(--font-heading);
	font-size: 22px;
	font-weight: 700;
	line-height: 1.2;
	text-align: start;
`;

const Details = styled.div`
	margin-top: 12px;

	p {
		margin: 0 0 10px;
		color: var(--color-text-muted);
		font-size: 15px;
		line-height: 1.5;
		text-align: start;
	}

	p:last-of-type {
		margin-bottom: 0;
	}
`;

/**
 * Buttons stacked rather than sat in a row: the whole point of coming up from the bottom edge is
 * that both answers land under the thumb, and a full-width target is harder to mis-tap.
 */
const Answers = styled.div`
	display: grid;
	gap: 10px;
	margin-top: 22px;
`;

/**
 * The app's confirmation prompt: a sheet that rises from the bottom edge, asking whatever
 * `ConfirmationStore` is currently asking.
 *
 * Mounted once per shell rather than per caller — the store holds the question, so a component
 * that needs one awaits `confirmation.ask()` and never owns any dialog state itself. There is
 * only ever one question on screen, which is what lets a single mount serve every caller.
 */
export const ConfirmationDrawer = observer(function ConfirmationDrawer() {
	const { confirmation, translations } = useRootStore();
	const id = useId();
	const request = confirmation.pending;
	const questionId = `confirmation-question-${id}`;
	const detailsId = `confirmation-details-${id}`;
	const hasDetails = !!request?.details?.length;

	return (
		<Sheet
			anchor="bottom"
			className="confirmation-drawer"
			open={request !== null}
			// Matching `Dialog`: the sheet's content lives in the store, so an outgoing transition
			// would animate an empty panel.
			transitionDuration={0}
			onClose={() => confirmation.dismiss()}
			slotProps={{
				paper: {
					className: 'confirmation-panel',
					dir: translations.dir,
					// Focus lands on the panel itself, the way MUI's own `Dialog` arranges it: a screen
					// reader then announces the question on arrival, and neither answer is pre-armed for
					// a stray Enter. `FocusTrap` keeps the keyboard inside from there.
					tabIndex: -1,
					// `alertdialog` rather than `dialog`: this interrupts to ask, and the question is
					// what a screen reader should announce on arrival.
					role: 'alertdialog',
					'aria-modal': true,
					'aria-labelledby': questionId,
					'aria-describedby': hasDetails ? detailsId : undefined,
				},
			}}
		>
			{request ? (
				<>
					{/*
					 * `dir="auto"` on the copy, not the panel's direction: the sheet serves both
					 * localized guest copy and the admin screens' English, and the shell is already
					 * RTL for a worker whose saved language is. Letting each run of text pick its own
					 * direction is what keeps an English question from rendering as "?the question".
					 */}
					<Question id={questionId} className="confirmation-question" dir="auto">
						{request.question}
					</Question>
					{request.details?.length ? (
						<Details id={detailsId} className="confirmation-details">
							{request.details.map((paragraph) => (
								<p key={paragraph} dir="auto">
									{paragraph}
								</p>
							))}
						</Details>
					) : null}
					<Answers className="confirmation-answers">
						<Button
							type="button"
							fullWidth
							color={request.destructive ? 'error' : 'primary'}
							onClick={() => confirmation.confirm()}
						>
							{request.confirmLabel}
						</Button>
						<Button
							type="button"
							fullWidth
							variant="outlined"
							onClick={() => confirmation.dismiss()}
						>
							{request.dismissLabel}
						</Button>
					</Answers>
				</>
			) : null}
		</Sheet>
	);
});
