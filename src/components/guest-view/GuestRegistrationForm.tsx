import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import type { FormEvent } from 'react';

import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import type { RegistrationSubmitResult } from '../../stores/registration.store';
import { AppButton } from '../AppButton';
import { RegistrationCountdown } from '../RegistrationCountdown';
import { GuestLotteryForm } from './GuestLotteryForm';
import { GuestSignupForm } from './GuestSignupForm';

export type GuestRegistrationFormProps = {
	/**
	 * Which flow this instance represents — changes the copy shown for the form, and whether the
	 * lottery-entry fields render at all: "join the queue" only makes sense once registration is
	 * genuinely open.
	 */
	context: 'queue' | 'early';
	/** Ticked by the container so the countdown stays live; unused unless `context` is `'queue'`. */
	now: number;
	onSubmitted: (result: RegistrationSubmitResult) => void;
};

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

/**
 * The registration form, in both the flows it serves: joining today's queue, and signing up ahead
 * of a session that has not opened yet.
 *
 * It owns the copy and the phase decisions — which fields to show, which wording to use, when the
 * countdown is meaningful — and leaves the fields themselves to `GuestSignupForm` and
 * `GuestLotteryForm`, which read the same registration store.
 */
export const GuestRegistrationForm = observer(function GuestRegistrationForm({
	context,
	now,
	onSubmitted,
}: GuestRegistrationFormProps) {
	const t = useTranslation();
	const rootStore = useRootStore();
	const { guest, registration, session } = rootStore;

	const registrationQuestions = session.currentState?.questions ?? [];
	/** When registration is genuinely open right now, the moment it closes; otherwise `null`. */
	const registrationClosesAt = session.marketEvent?.registrationClosesAt ?? null;
	/**
	 * Whether this device has a cached local identity (name and phone) to prefill — hides the
	 * sign-up fields when so, since there's nothing left to ask. A device token alone isn't enough:
	 * a legacy token with no locally cached profile still needs to collect the fields.
	 */
	const showSignupFields = context === 'early' || guest.identity === null;

	/** The strings that differ between joining today's queue and signing up ahead of time. */
	const copy =
		context === 'early'
			? {
					formTitle: t.earlyFormTitle,
					formDescription: t.earlyFormDescription,
					submit: t.earlySubmit,
					submitting: t.earlySubmitting,
				}
			: {
					formTitle: t.formTitle,
					formDescription: t.formDescription,
					submit: t.submit,
					submitting: t.submitting,
				};

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const result = await registration.submit(
			context,
			session.marketEvent?.id ?? null,
			rootStore.translations.locale,
		);

		onSubmitted(result);
	}

	return (
		<Form onSubmit={(event) => void handleSubmit(event)}>
			<Heading className="form-heading">
				{context === 'queue' && registrationClosesAt ? (
					<RegistrationCountdown
						now={now}
						closesAt={registrationClosesAt}
						closesInLabel={t.registrationClosesIn}
						minutesRemainingTemplate={t.registrationClosesInMinutes}
					/>
				) : null}
				<h2>{copy.formTitle}</h2>
				<p>{copy.formDescription}</p>
			</Heading>
			{showSignupFields ? <GuestSignupForm /> : null}
			{context === 'queue' ? (
				<GuestLotteryForm registrationQuestions={registrationQuestions} />
			) : null}
			{registration.submissionError ? (
				<SubmissionError className="submission-error" role="alert">
					{t.submissionError}
				</SubmissionError>
			) : null}
			<AppButton
				type="submit"
				disabled={registration.isSubmitting}
				label={registration.isSubmitting ? copy.submitting : copy.submit}
				trailing="→"
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
