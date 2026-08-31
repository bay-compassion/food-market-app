import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import type { FormEvent, ReactNode } from 'react';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';

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
		letter-spacing: -0.01em;
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
	children: ReactNode;
};

/** Shared visual and submission shell for the market-registration and identity-only forms. */
export const GuestForm = observer(function GuestForm({
	title,
	description,
	submitLabel,
	submittingLabel,
	onSubmit,
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
			{registration.submissionError ? (
				<SubmissionError className="submission-error" role="alert">
					{t.submissionError}
				</SubmissionError>
			) : null}
			<Button type="submit" disabled={registration.isSubmitting} size="large">
				{registration.isSubmitting ? submittingLabel : submitLabel}
			</Button>
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
