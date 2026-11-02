import styled from '@emotion/styled';
import { Alert, Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { adminTranslations } from '../../adminLocales';
import { AdminApi } from '../../services/admin-api';
import {
	HouseholdServiceStore,
	type HouseholdServiceApi,
} from '../../stores/household-service.store';
import { useRootStore } from '../../stores/react/store-context';
import { NumberSpinner } from '../NumberSpinner';
import { Dialog } from '../ui/Dialog';
import { HouseholdServiceEntryRow } from './HouseholdServiceEntryRow';

const Content = styled.div`
	display: grid;
	gap: 16px;
	form,
	.entry {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 16px;
	}
	p {
		margin: 0;
	}
	&[data-inline='true'] {
		padding: 4px 8px 8px;
		gap: 12px;
		.recorder-help,
		.recorder-success {
			font-size: 14px;
			line-height: 1.5;
			color: var(--color-text-subtle);
		}
		.record-form {
			display: flex;
			flex-wrap: wrap;
			align-items: end;
			.number-spinner {
				flex: 1 1 220px;
				max-width: 320px;
				min-width: 0;
			}
		}
		.record-form > button {
			min-height: 58px;
			justify-self: start;
		}
		ul {
			gap: 0;
		}
		.entry {
			min-height: 48px;
			border-top: 1px solid var(--color-divider);
			flex-wrap: nowrap;
		}
		.entry > span {
			flex: 1;
			font-size: 14px;
			color: var(--color-text-muted);
		}
		.entry:has(form) {
			flex-wrap: wrap;
		}
		.entry form {
			flex-basis: 100%;
		}
	}
`;

export const HouseholdServiceForm = observer(function HouseholdServiceForm({
	store,
	inline = false,
}: {
	store: HouseholdServiceStore;
	inline?: boolean;
}) {
	const t = adminTranslations.en.householdService;
	const [size, setSize] = useState<number | string>('');
	const [saved, setSaved] = useState(false);
	const form = useRef<HTMLFormElement>(null);

	useEffect(() => {
		void store.load();
	}, [store]);

	useEffect(() => {
		if (!inline && store.loaded && !store.pending) {
			form.current?.querySelector<HTMLInputElement>('[inputmode="numeric"]')?.focus();
		}
	}, [inline, store.loaded, store.pending]);

	async function submit(event: FormEvent) {
		event.preventDefault();
		setSaved(false);

		if (await store.record(Number(size))) {
			setSize('');
			setSaved(true);
			form.current?.querySelector<HTMLInputElement>('[inputmode="numeric"]')?.focus();
		}
	}

	return (
		<Content data-inline={inline}>
			<p className="recorder-help">{inline ? t.queueHelp : t.help}</p>
			{store.error ? <Alert severity="error">{t.errors[store.error]}</Alert> : null}
			{saved && inline ? (
				<p role="status" className="recorder-success">
					{t.queueSaved}
				</p>
			) : saved ? (
				<Alert severity="success" role="status">
					{t.saved}
				</Alert>
			) : null}
			<form ref={form} className="record-form" onSubmit={(event) => void submit(event)}>
				<NumberSpinner
					label={t.size}
					value={store.pending?.householdSize ?? size}
					onChange={(value) => {
						setSize(value);
						setSaved(false);
					}}
					disabled={store.busy || !!store.pending || !store.loaded}
					min={1}
					max={30}
					required
					decrementLabel={adminTranslations.en.decreaseNumber}
					incrementLabel={adminTranslations.en.increaseNumber}
				/>
				<Button type="submit" variant="contained" disabled={store.busy || !store.loaded}>
					{store.pending ? t.retrySave : inline ? t.queueRecord : t.record}
				</Button>
			</form>
			{!inline ? (
				<Button onClick={() => void store.load()} disabled={store.busy}>
					{t.refresh}
				</Button>
			) : null}
			{store.loaded && !inline ? (
				<p>
					{t.total}: <strong>{store.households}</strong> {t.households},{' '}
					<strong>{store.members}</strong> {t.people}
				</p>
			) : null}
			<ul aria-label={t.entries}>
				{store.entries.map((entry) => (
					<HouseholdServiceEntryRow
						key={`${entry.id}-${entry.version}`}
						entry={entry}
						store={store}
						inline={inline}
					/>
				))}
			</ul>
		</Content>
	);
});

/** Keep the recorder mounted while closed so an uncertain network save retains its retry id. */
export const HouseholdServiceRecorder = observer(function HouseholdServiceRecorder({
	marketEventId,
	api,
	initiallyOpen = false,
	onClosed,
}: {
	marketEventId: string;
	api?: HouseholdServiceApi;
	initiallyOpen?: boolean;
	onClosed?: () => void;
}) {
	const root = useRootStore();
	const t = adminTranslations.en.householdService;
	const [open, setOpen] = useState(initiallyOpen);
	const [store] = useState(
		() =>
			new HouseholdServiceStore(
				marketEventId,
				api ?? new AdminApi({ requestHeaders: () => root.requestHeaders() }),
			),
	);

	return (
		<>
			{!initiallyOpen ? (
				<Button variant="outlined" onClick={() => setOpen(true)}>
					{t.title}
				</Button>
			) : null}
			<Dialog
				open={open}
				title={t.title}
				closeLabel={t.close}
				onClose={() => {
					if (!store.busy) {
						setOpen(false);
						onClosed?.();
					}
				}}
			>
				{open ? <HouseholdServiceForm store={store} /> : null}
			</Dialog>
		</>
	);
});
