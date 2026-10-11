import styled from '@emotion/styled';
import Button from '@mui/material/Button';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { Dialog } from '../Dialog';

const DeviceId = styled.code`
	display: block;
	padding: 14px;
	overflow-wrap: anywhere;
	border-radius: var(--radius-sm);
	color: var(--color-brand-dark);
	background: var(--color-surface-soft);
	font-size: 14px;
	line-height: 1.5;
	direction: ltr;
	text-align: start;
`;

type DeviceIdDialogProps = {
	open: boolean;
	onClose: () => void;
};

/** Shows this device's ID, so a guest can read it out or paste it to staff. */
export const DeviceIdDialog = observer(function DeviceIdDialog({
	open,
	onClose,
}: DeviceIdDialogProps) {
	const { appBar: t } = useTranslation();
	const { guest, notifications } = useRootStore();
	const [copied, setCopied] = useState(false);
	const [wasOpen, setWasOpen] = useState(open);

	// Each opening starts from "Copy" again, rather than remembering the last one.
	if (open !== wasOpen) {
		setWasOpen(open);

		if (open) {
			setCopied(false);
		}
	}

	async function copyDeviceId() {
		if (!guest.deviceId) {
			return;
		}

		try {
			await navigator.clipboard.writeText(guest.deviceId);
			setCopied(true);
		} catch {
			notifications.error(t.copyDeviceIdError);
		}
	}

	return (
		<Dialog
			open={open}
			title={t.deviceIdDialogTitle}
			closeLabel={t.closeDeviceIdDialog}
			onClose={onClose}
			actions={
				<Button onClick={() => void copyDeviceId()}>
					{copied ? t.deviceIdCopied : t.copyDeviceId}
				</Button>
			}
		>
			<DeviceId>{guest.deviceId}</DeviceId>
		</Dialog>
	);
});
