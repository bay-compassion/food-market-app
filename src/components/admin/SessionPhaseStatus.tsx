import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import type { SessionCommand } from '../../services/sessionStateMachine';
import { currentSessionState } from '../../services/sessionStateMachine';
import type { VisitStatus } from '../../services/visitStateMachine';
import { useRootStore } from '../../stores/react/store-context';
import { BeforeTheMarket } from './BeforeTheMarket';
import { formatClockTime } from './session-format';
import { SessionMilestoneList } from './SessionMilestoneList';
import { SessionOverview } from './SessionOverview';
import { SessionCountdown, SessionStatusCard, SessionStatusValue } from './SessionStatusCard';
import type { AdminView } from './types';

const Stats = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 10px;

	> div {
		padding: 14px;
		border: 1.5px solid var(--color-border-soft);
		border-radius: var(--radius-md);
	}

	p {
		margin: 0;
	}

	.count {
		color: var(--color-brand);
		font-family: var(--font-heading);
		font-size: 30px;
		font-weight: 700;
	}

	.what {
		margin-top: 2px;
		color: var(--color-text-muted);
		font-size: 14px;
	}
`;

const Actions = styled.div`
	display: grid;
	gap: 10px;
`;

export type SessionPhaseStatusProps = {
	statusLabels: Record<VisitStatus, string>;
	busy?: boolean;
	onRun: (action: SessionCommand) => void;
	onNavigate: (view: AdminView) => void;
};

/**
 * The top of the Today screen: where the session stands and what happens next, the whole day's
 * timeline, and whatever this phase asks of a worker first. Most phases ask nothing; a draw with
 * nobody to run it but them is the exception, and the only thing here that is a filled button
 * before service.
 */
export const SessionPhaseStatus = observer(function SessionPhaseStatus({
	statusLabels,
	busy,
	onRun,
	onNavigate,
}: SessionPhaseStatusProps) {
	const t = adminTranslations.en;
	const { admin, session, translations } = useRootStore();
	// Steering the session is for whoever set it up. Everyone else can still see where it stands.
	const canSteer = admin.can('manage:sessions');
	const event = session.currentState?.event;
	const counts = session.currentState?.counts ?? {};
	const milestones = session.milestones;
	const phase = currentSessionState(event?.status);

	if (!event || !milestones || phase === 'inactive') {
		return (
			<>
				<p>{canSteer ? t.noSessionHelp : t.today.noSessionWorker}</p>
				{canSteer ? (
					<Button type="button" onClick={() => onNavigate('schedule')}>
						{t.scheduleOpenSchedule}
					</Button>
				) : null}
			</>
		);
	}

	const clock = (date: Date | string) => formatClockTime(new Date(date), translations.locale);
	const spots = (template: string) =>
		template
			.replace('{registered}', String(counts.registered ?? 0))
			.replace('{capacity}', String(event.capacity));

	switch (phase) {
		case 'scheduled':
			return (
				<>
					<SessionStatusCard
						lead={t.today.nothingToDoYet}
						value={<SessionStatusValue>{clock(event.registrationOpensAt)}</SessionStatusValue>}
						help={t.today.opensByItself.replace(
							'{date}',
							new Intl.DateTimeFormat(translations.locale, {
								weekday: 'long',
								month: 'short',
								day: 'numeric',
							}).format(new Date(event.registrationOpensAt)),
						)}
					/>
					<SessionMilestoneList />
					{canSteer ? <BeforeTheMarket onOpenChecklist={() => onNavigate('checklist')} /> : null}
				</>
			);
		case 'registration_open':
			return (
				<>
					<SessionStatusCard
						lead={t.today.closesByItself.replace('{time}', clock(event.registrationClosesAt))}
						value={<SessionCountdown deadline={new Date(event.registrationClosesAt)} />}
						help={t.today.leftToRegister}
					/>
					<SessionMilestoneList />
					<Stats>
						<div>
							<p className="count">{counts.registered ?? 0}</p>
							<p className="what">{t.today.registered}</p>
						</div>
						<div>
							<p className="count">{event.capacity}</p>
							<p className="what">{t.today.spots}</p>
						</div>
					</Stats>
				</>
			);
		case 'registration_closed':
			return (
				<>
					<SessionStatusCard
						lead={t.closed}
						value={<SessionCountdown deadline={milestones.graceDeadline} />}
						help={t.registrationClosedHelp}
					/>
					<SessionMilestoneList />
				</>
			);
		case 'lottery_pending':
			return milestones.lotteryDrawsAt ? (
				<>
					<SessionStatusCard
						attention
						lead={t.today.drawsByItself.replace('{time}', clock(milestones.lotteryDrawsAt))}
						value={<SessionCountdown deadline={milestones.lotteryDrawsAt} />}
						help={spots(t.today.drawResult)}
					/>
					<SessionMilestoneList />
				</>
			) : (
				<>
					<SessionStatusCard
						attention
						lead={t.lotteryActions}
						value={
							<SessionStatusValue>
								{canSteer ? t.today.drawReady : t.today.drawWaiting}
							</SessionStatusValue>
						}
						help={spots(canSteer ? t.today.drawManual : t.today.drawWaitingHelp)}
					/>
					{canSteer ? (
						<Button type="button" disabled={busy} onClick={() => onRun('run_lottery')}>
							{t.runLottery}
						</Button>
					) : null}
					<SessionMilestoneList />
				</>
			);
		case 'service_started':
			return (
				<>
					<SessionOverview counts={counts} statusLabels={statusLabels} />
					<SessionMilestoneList />
					<Actions>
						<Button type="button" onClick={() => onNavigate('queue')}>
							{t.goToQueue}
						</Button>
						{canSteer ? (
							<Button type="button" variant="outlined" onClick={() => onNavigate('broadcast')}>
								{t.today.sendBroadcast}
							</Button>
						) : null}
					</Actions>
				</>
			);
	}
});
