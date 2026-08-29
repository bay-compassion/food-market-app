import type { FormEvent } from 'react';

import { adminTranslations } from '../../adminLocales';
import { AppButton } from '../AppButton';

export type Broadcast = { title: string; body: string };

export type SessionBroadcastFormProps = {
	busy?: boolean;
	broadcast: Broadcast;
	onBroadcastChange: (broadcast: Broadcast) => void;
	onSend: () => void;
};

/** A push/SMS message to everyone with a live visit in this session. */
export function SessionBroadcastForm({
	busy,
	broadcast,
	onBroadcastChange,
	onSend,
}: SessionBroadcastFormProps) {
	const t = adminTranslations.en;

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		onSend();
	}

	return (
		<section className="admin-section broadcast-card">
			<h2>{t.broadcastTitle}</h2>
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
				<AppButton type="submit" disabled={busy} label={t.broadcastSend} />
			</form>
		</section>
	);
}
