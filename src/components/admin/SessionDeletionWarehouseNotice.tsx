import { Checkbox, FormControlLabel } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import type { CoveringSnapshot } from '../../services/session-deletion';
import { useRootStore } from '../../stores/react/store-context';

export type SessionDeletionWarehouseNoticeProps = {
	snapshots: CoveringSnapshot[];
	forced: boolean;
	onForcedChange: (forced: boolean) => void;
};

/**
 * What deleting an already-warehoused session also takes: every frozen snapshot that counts it,
 * listed one by one, and the box the steward ticks to remove them too. Until it is ticked the
 * dialog offers nothing else, since the server refuses the deletion without it.
 */
export const SessionDeletionWarehouseNotice = observer(function SessionDeletionWarehouseNotice({
	snapshots,
	forced,
	onForcedChange,
}: SessionDeletionWarehouseNoticeProps) {
	const t = adminTranslations.en.sessionDeletion;
	const { translations } = useRootStore();
	const month = new Intl.DateTimeFormat(translations.locale, { month: 'long', year: 'numeric' });
	const year = new Intl.DateTimeFormat(translations.locale, { year: 'numeric' });

	function periodOf(snapshot: CoveringSnapshot): string {
		const start = new Date(snapshot.periodStart);

		switch (snapshot.kind) {
			case 'session':
				return '';
			case 'month':
				return month.format(start);
			case 'quarter':
				return `Q${Math.floor(start.getMonth() / 3) + 1} ${year.format(start)}`;
			case 'year':
				return year.format(start);
		}
	}

	function labelOf(snapshot: CoveringSnapshot): string {
		const label = t.snapshotKinds[snapshot.kind].replace('{period}', periodOf(snapshot));

		return snapshot.revision > 1
			? t.snapshotRevision
					.replace('{label}', label)
					.replace('{revision}', String(snapshot.revision))
			: label;
	}

	return (
		<>
			<p className="session-delete-warning" role="alert">
				{t.warehoused}
			</p>
			<ul aria-label={t.warehoused}>
				{snapshots.map((snapshot) => (
					<li key={snapshot.id}>{labelOf(snapshot)}</li>
				))}
			</ul>
			<p className="session-delete-note">{t.warehouseRetake}</p>
			<FormControlLabel
				control={
					<Checkbox checked={forced} onChange={(event) => onForcedChange(event.target.checked)} />
				}
				label={t.forceLabel}
			/>
		</>
	);
});
