import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { guestVisitStatusLabel } from '../../services/visitStatusLabels';
import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import { AppButton } from '../AppButton';

export type GuestVisitStatusProps = {
	successTitle: string;
	successDescription: string;
	onCancelVisit: () => void;
};

const State = styled.div`
	display: grid;
	min-height: 340px;
	place-content: center;
	text-align: center;

	h2 {
		margin-bottom: 9px;
		font-family: var(--font-heading);
		font-size: 29px;
		letter-spacing: -0.01em;
		text-transform: uppercase;
		color: var(--color-text);
	}

	p {
		max-width: 280px;
		margin: 0 auto 27px;
		color: var(--color-text-muted);
		font-size: 16px;
		line-height: 1.55;
	}
`;

const Checkmark = styled.div<{ $called?: boolean }>`
	display: grid;
	width: 58px;
	height: 58px;
	place-self: center;
	place-items: center;
	margin-bottom: 19px;
	border-radius: var(--radius-md);
	color: var(--color-on-brand);
	background: ${({ $called }) => ($called ? 'var(--color-error)' : 'var(--color-brand)')};
	font-size: ${({ $called }) => ($called ? '34px' : '29px')};
`;

const QueueStanding = styled.div`
	margin-bottom: 27px;
	padding: 18px;
	border-radius: var(--radius-md);
	background: var(--color-surface-soft);

	p {
		margin-bottom: 0;
	}
`;

const QueuePosition = styled.p`
	display: grid;
	gap: 4px;
	margin-bottom: 8px;

	strong {
		font-family: var(--font-heading);
		font-size: 44px;
		line-height: 1;
		color: var(--color-brand);
	}
`;

const QueueNext = styled.p`
	font-weight: 700;
`;

const SubmissionError = styled.p`
	margin: 0;
	color: var(--color-error);
	font-size: 13px;
	line-height: 1.4;
`;

/**
 * Where the guest stands once they have a visit: their place in line, or — the moment they are
 * called — a panel that replaces the whole card rather than a changed status word, since a guest
 * glancing at their phone across the room has to catch it.
 */
export const GuestVisitStatus = observer(function GuestVisitStatus({
	successTitle,
	successDescription,
	onCancelVisit,
}: GuestVisitStatusProps) {
	const t = useTranslation();
	const rootStore = useRootStore();
	const { visit } = rootStore;

	const visitStatusLabel = visit.currentVisit
		? guestVisitStatusLabel(rootStore.translations.locale, visit.currentVisit.status)
		: '';

	const isOutcome =
		visit.currentVisit?.status === 'served' ||
		visit.currentVisit?.status === 'not_placed' ||
		visit.currentVisit?.status === 'no_show' ||
		visit.currentVisit?.status === 'cancelled';

	return (
		<State className="success-state">
			{visit.isCalled ? (
				<>
					<Checkmark className="checkmark called-mark" $called aria-hidden="true">
						→
					</Checkmark>
					<h2>{t.calledTitle}</h2>
					<p>{t.calledDescription}</p>
				</>
			) : isOutcome ? (
				<>
					<Checkmark className="checkmark outcome-mark" aria-hidden="true">
						•
					</Checkmark>
					<h2>{visitStatusLabel}</h2>
				</>
			) : (
				<>
					<Checkmark className="checkmark">✓</Checkmark>
					<h2>{successTitle}</h2>
					{visit.queuePosition ? (
						<QueueStanding className="queue-standing">
							<QueuePosition className="queue-position">
								<span>{t.queuePositionLabel}</span>
								<strong>{visit.queuePosition}</strong>
							</QueuePosition>
							{visit.guestsAhead === 0 ? (
								<QueueNext className="queue-next">{t.youAreNext}</QueueNext>
							) : visit.guestsAhead !== null ? (
								<p>
									{t.guestsAheadOfYou}: <strong>{visit.guestsAhead}</strong>
								</p>
							) : null}
						</QueueStanding>
					) : (
						<p>
							{t.currentStatus}: <strong>{visitStatusLabel}</strong>
						</p>
					)}
					<p>{successDescription}</p>
				</>
			)}
			{visit.cancelError ? (
				<SubmissionError className="submission-error" role="alert">
					{t.visitError}
				</SubmissionError>
			) : null}
			{visit.canCancel ? (
				<AppButton
					type="button"
					variant="secondary"
					disabled={visit.isCancelling}
					onClick={onCancelVisit}
					label={t.cancelVisit}
				/>
			) : null}
		</State>
	);
});
