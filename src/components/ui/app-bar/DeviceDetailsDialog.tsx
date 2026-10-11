import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { Dialog } from '../Dialog';
import { CopyableValue } from './CopyableValue';

const Fields = styled.div`
	display: grid;
	gap: 22px;
`;

type DeviceDetailsDialogProps = {
	open: boolean;
	onClose: () => void;
};

/**
 * This device's identifiers, so a guest can read them out or paste them to staff: the install ID,
 * which every device has from its first launch, and — once a guest has registered here — the
 * device token their registration saved.
 */
export const DeviceDetailsDialog = observer(function DeviceDetailsDialog({
	open,
	onClose,
}: DeviceDetailsDialogProps) {
	const {
		appBar: { deviceDetails: t },
	} = useTranslation();
	const { guest } = useRootStore();

	// The dialog unmounts its content when it closes, so each opening starts every row from "Copy".
	return (
		<Dialog open={open} title={t.title} closeLabel={t.close} onClose={onClose}>
			<Fields>
				<CopyableValue
					label={t.installIdLabel}
					value={guest.installId}
					copyLabel={t.copyInstallId}
				/>
				{guest.deviceId ? (
					<CopyableValue
						label={t.deviceTokenLabel}
						value={guest.deviceId}
						copyLabel={t.copyDeviceToken}
						hint={t.deviceTokenHint}
					/>
				) : null}
			</Fields>
		</Dialog>
	);
});
