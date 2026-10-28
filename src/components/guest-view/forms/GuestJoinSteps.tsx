import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import type { SessionQuestion } from '../../../stores/market-session.store';
import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';

const Steps = styled.ol`
	display: grid;
	grid-auto-columns: minmax(0, 1fr);
	grid-auto-flow: column;
	gap: 8px;
	margin: 0;
	padding: 0;
	list-style: none;
`;

const Step = styled.li`
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 10px;
	border-radius: var(--radius-sm);
	background: var(--color-surface-muted);
	color: var(--color-text-muted);
	font-size: 14px;
	font-weight: 500;
	line-height: 1.25;

	&[data-done] {
		background: var(--color-surface-soft);
		color: var(--color-brand);
	}
`;

const Marker = styled.span`
	display: grid;
	flex: 0 0 22px;
	place-items: center;
	height: 22px;
	border: 2px solid currentColor;
	border-radius: 50%;
	font-size: 12px;
	font-weight: 700;

	[data-done] > & {
		border-color: var(--color-brand);
		background: var(--color-brand);
		color: var(--color-on-brand);
	}

	svg {
		width: 14px;
		height: 14px;
	}
`;

/**
 * What a returning guest has left before "Join the lottery", for the pinned bar: their form arrives
 * filled in, so without it the bar would have nothing to say until it is suddenly ready. A guest
 * filling the form in from scratch sees no list — the empty fields already say what is left.
 */
export const GuestJoinSteps = observer(function GuestJoinSteps({
	questions,
}: {
	/** The session's questions; owned by the container, as for the lottery form. */
	questions: readonly SessionQuestion[];
}) {
	const copy = useTranslation().guestView.forms.joinSteps;
	const { registration } = useRootStore();

	if (registration.savedHouseholdReview === 'none') {
		return null;
	}

	const steps = [
		{
			id: 'household',
			done: registration.isHouseholdConfirmed,
			label: registration.isHouseholdConfirmed ? copy.householdConfirmed : copy.confirmHousehold,
		},
		...(questions.length > 0
			? [
					{
						id: 'questions',
						done: registration.hasAnsweredQuestions(questions),
						label: registration.hasAnsweredQuestions(questions)
							? copy.questionsAnswered
							: copy.answerQuestions,
					},
				]
			: []),
	];

	return (
		<Steps className="join-steps" aria-label={copy.label}>
			{steps.map((step, index) => (
				<Step key={step.id} data-done={step.done || undefined}>
					<Marker aria-hidden="true">
						{step.done ? (
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
								<path d="M5 12.5l4.5 4.5L19 7.5" />
							</svg>
						) : (
							index + 1
						)}
					</Marker>
					{step.label}
				</Step>
			))}
		</Steps>
	);
});
