import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import { serviceProgressLevels, type ServiceProgress } from '../../services/demoScenario';
import { sessionStatuses, type SessionStatus } from '../../services/sessionStateMachine';
import { useRootStore } from '../../stores/react/store-context';

export type DevModeViewProps = {
	busy?: boolean;
	onLoad: (stage: SessionStatus, serviceProgress: ServiceProgress | undefined) => void;
};

const Section = styled.section`
	.dev-scenario-list {
		display: grid;
		gap: 12px;
		margin-top: 18px;
	}

	.dev-scenario {
		display: grid;
		gap: 12px;
		padding: 18px;
		border: 1.5px solid #c7d2cc;
		border-radius: var(--radius-md);
	}

	.dev-scenario > div > p {
		margin-top: 4px;
		color: var(--color-text-subtle);
		font-size: 13px;
		line-height: 1.5;
	}

	.dev-progress-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	@media (min-width: 860px) {
		.dev-scenario {
			grid-template-columns: minmax(0, 1fr) auto;
			align-items: center;
		}
	}
`;

/**
 * Loads fake data staged at a chosen point on the session lifecycle, for demos and screenshots.
 * Only ever offered to a worker holding `manage:demo-data` (see `types.ts`'s `viewPermissions`),
 * and even then the server may have the feature turned off entirely — see `docs/roles.md`.
 *
 * Checking whether the tool is enabled is this view's own concern, the same way `ReportsView` owns
 * its own fetching; actually loading a scenario is not, since it changes the session every other
 * screen reads — that stays a container action in `AdminDashboard`, same as `runMarketAction`.
 */
export const DevModeView = observer(function DevModeView({ busy, onLoad }: DevModeViewProps) {
	const t = adminTranslations.en;
	const { admin } = useRootStore();
	/** `null` while still checking. */
	const [enabled, setEnabled] = useState<boolean | null>(null);

	useEffect(() => {
		let cancelled = false;

		void admin.isDemoDataEnabled().then((value) => {
			if (!cancelled) {
				setEnabled(value);
			}
		});

		return () => {
			cancelled = true;
		};
	}, [admin]);

	const stageTitles: Record<SessionStatus, string> = {
		draft: t.devStageDraftTitle,
		scheduled: t.devStageScheduledTitle,
		registration_open: t.devStageRegistrationOpenTitle,
		registration_closed: t.devStageRegistrationClosedTitle,
		lottery_pending: t.devStageLotteryPendingTitle,
		service_started: t.devStageServiceStartedTitle,
		ended: t.devStageEndedTitle,
	};
	const stageDescriptions: Record<SessionStatus, string> = {
		draft: t.devStageDraftDescription,
		scheduled: t.devStageScheduledDescription,
		registration_open: t.devStageRegistrationOpenDescription,
		registration_closed: t.devStageRegistrationClosedDescription,
		lottery_pending: t.devStageLotteryPendingDescription,
		service_started: t.devStageServiceStartedDescription,
		ended: t.devStageEndedDescription,
	};
	const progressLabels: Record<ServiceProgress, string> = {
		just_started: t.devProgressJustStarted,
		halfway: t.devProgressHalfway,
		nearly_done: t.devProgressNearlyDone,
	};

	return (
		<Section className="admin-section action-card">
			<p>{t.devModeIntro}</p>

			{enabled === false ? (
				<p className="admin-feedback" role="status">
					{t.devModeDisabled}
				</p>
			) : enabled ? (
				<div className="dev-scenario-list">
					{sessionStatuses.map((stage) => (
						<article key={stage} className="dev-scenario">
							<div>
								<strong>{stageTitles[stage]}</strong>
								<p>{stageDescriptions[stage]}</p>
							</div>
							{/* `service_started` covers the most ground of any status, so it gets one button
							    per progress level instead of a single "load" button. */}
							{stage === 'service_started' ? (
								<div className="dev-progress-actions">
									{serviceProgressLevels.map((progress) => (
										<Button
											key={progress}
											type="button"
											variant="outlined"
											disabled={busy}
											onClick={() => onLoad('service_started', progress)}
										>
											{progressLabels[progress]}
										</Button>
									))}
								</div>
							) : (
								<Button
									type="button"
									variant="outlined"
									disabled={busy}
									onClick={() => onLoad(stage, undefined)}
								>
									{t.devModeLoad}
								</Button>
							)}
						</article>
					))}
				</div>
			) : null}
		</Section>
	);
});
