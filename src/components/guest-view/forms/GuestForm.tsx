import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import type { FormEvent, ReactNode } from 'react';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';

const Form = styled.form`
	display: grid;
	gap: 18px;

	/*
	 * While a field has focus the on-screen keyboard (or iOS's picker wheel) covers the bottom of
	 * the screen, and a bar pinned there would sit on top of the field being typed into. Dropping it
	 * back into the flow costs no layout shift: a sticky element already holds its place at the end.
	 */
	&:has(input:focus, textarea:focus, select:focus) .submit-bar[data-sticky] {
		position: static;
		box-shadow: none;
	}
`;

/** The submit button and its error; pinned to the bottom of the screen when `stickySubmit` is set. */
const SubmitBar = styled.div`
	display: grid;
	gap: 18px;

	&[data-sticky] {
		position: sticky;
		bottom: 0;
		z-index: 1;
		padding-block: 12px calc(12px + env(safe-area-inset-bottom));
		background: var(--color-surface);
		box-shadow: 0 -8px 24px rgb(30 71 77 / 10%);

		button[type='submit'] {
			min-height: 48px;
		}
	}
`;

const Heading = styled.div`
	margin-bottom: 8px;

	h2 {
		margin-bottom: 9px;
		font-family: var(--font-heading);
		font-size: 29px;
		letter-spacing: var(--tracking-heading);
		text-transform: uppercase;
		color: var(--color-text);
	}

	p {
		color: var(--color-text-muted);
		font-size: 16px;
		line-height: 1.55;
	}
`;

const SubmissionError = styled.p`
	margin: 0;
	color: var(--color-error);
	font-size: 13px;
	line-height: 1.4;
`;

const Privacy = styled.p`
	display: flex;
	align-items: flex-start;
	gap: 8px;
	margin: 0;
	color: var(--color-text-muted);
	font-size: 13px;
	line-height: 1.5;

	svg {
		flex: 0 0 auto;
		width: 16px;
		margin-top: 1px;
	}
`;

type GuestFormProps = {
	title: string;
	description: string;
	submitLabel: string;
	submittingLabel: string;
	onSubmit: () => Promise<void>;
	/** Keeps the submit button on screen while the guest scrolls, for a form long enough that it
	 *  would otherwise sit below the fold. Its ancestors must not clip overflow, or it never sticks. */
	stickySubmit?: boolean;
	children: ReactNode;
};

/** Shared visual and submission shell for the market-registration and identity-only forms. */
export const GuestForm = observer(function GuestForm({
	title,
	description,
	submitLabel,
	submittingLabel,
	onSubmit,
	stickySubmit = false,
	children,
}: GuestFormProps) {
	const t = useTranslation();
	const { registration } = useRootStore();

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		void onSubmit();
	}

	return (
		<Form onSubmit={handleSubmit}>
			<Heading className="form-heading">
				<h2>{title}</h2>
				<p>{description}</p>
			</Heading>
			{children}
			{/* The error sits in the bar, so a guest who taps the pinned button sees it fail. */}
			<SubmitBar className="submit-bar" data-sticky={stickySubmit || undefined}>
				{registration.submissionError ? (
					<SubmissionError className="submission-error" role="alert">
						{t.submissionError}
					</SubmissionError>
				) : null}
				<Button type="submit" disabled={registration.isSubmitting} size="large">
					{registration.isSubmitting ? submittingLabel : submitLabel}
				</Button>
			</SubmitBar>
			<Privacy className="privacy">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<rect x="5" y="10" width="14" height="10" rx="2" />
					<path d="M8 10V7a4 4 0 0 1 8 0v3" />
				</svg>
				{t.privacy}
			</Privacy>
		</Form>
	);
});
