import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import type { FormEvent, ReactNode } from 'react';

import { useTranslation } from '../../../stores/react/use-translation';
import { GuestFormSubmitBar } from './GuestFormSubmitBar';

const Form = styled.form`
	display: grid;
	gap: 18px;
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
	/** Leave both out for a form whose sections' legends already say what it asks for. */
	title?: string;
	description?: string;
	submitLabel: string;
	submittingLabel: string;
	onSubmit: () => Promise<void>;
	/** Keeps the submit button on screen while the guest scrolls, for a form long enough that it
	 *  would otherwise sit below the fold. Its ancestors must not clip overflow, or it never sticks. */
	stickySubmit?: boolean;
	/** Whether the form is complete, so the bar points at the button. Leave it out for a form that
	 *  has no such moment. */
	ready?: boolean;
	/** What is left before the form is ready, shown in the bar until it is. */
	progress?: ReactNode;
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
	ready,
	progress,
	children,
}: GuestFormProps) {
	const t = useTranslation();

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		void onSubmit();
	}

	return (
		<Form onSubmit={handleSubmit}>
			{title ? (
				<Heading className="form-heading">
					<h2>{title}</h2>
					{description ? <p>{description}</p> : null}
				</Heading>
			) : null}
			{children}
			<GuestFormSubmitBar
				submitLabel={submitLabel}
				submittingLabel={submittingLabel}
				sticky={stickySubmit}
				ready={ready}
				progress={progress}
			/>
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
