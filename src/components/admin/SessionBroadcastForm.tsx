import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import type { FormEvent } from 'react';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';

export type Broadcast = { title: string; body: string };

export type SessionBroadcastFormProps = {
	broadcast: Broadcast;
	onBroadcastChange: (broadcast: Broadcast) => void;
	onSend: () => void;
};

/** A push/SMS message to everyone with a live visit in this session. */
export const SessionBroadcastForm = observer(function SessionBroadcastForm({
	broadcast,
	onBroadcastChange,
	onSend,
}: SessionBroadcastFormProps) {
	const t = adminTranslations.en;
	const { admin, session } = useRootStore();

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!session.isActive || admin.isBusy) {
			return;
		}
		onSend();
	}

	if (!session.isActive) {
		return (
			<section className="admin-section broadcast-card">
				<p role="status">{t.broadcastUnavailable}</p>
			</section>
		);
	}

	return (
		<section className="admin-section broadcast-card">
			<p>{t.broadcastHelp}</p>
			<form onSubmit={handleSubmit}>
				<label>
					<span>{t.broadcastTitleLabel}</span>
					<input
						type="text"
						maxLength={100}
						required
						value={broadcast.title}
						onChange={(event) => onBroadcastChange({ ...broadcast, title: event.target.value })}
						onBlur={(event) =>
							onBroadcastChange({ ...broadcast, title: event.target.value.trim() })
						}
					/>
				</label>
				<label>
					<span>{t.broadcastMessageLabel}</span>
					<textarea
						maxLength={500}
						rows={4}
						required
						value={broadcast.body}
						onChange={(event) => onBroadcastChange({ ...broadcast, body: event.target.value })}
						onBlur={(event) => onBroadcastChange({ ...broadcast, body: event.target.value.trim() })}
					/>
				</label>
				<Button type="submit" disabled={admin.isBusy}>
					{t.broadcastSend}
				</Button>
			</form>
		</section>
	);
});
