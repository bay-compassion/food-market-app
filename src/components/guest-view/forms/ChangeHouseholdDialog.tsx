import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { Dialog } from '../../ui/Dialog';
import { HouseholdFields } from './HouseholdFields';

const Fields = styled.div`
	display: grid;
	gap: 18px;
	padding-top: 6px;
`;

/**
 * Where a returning guest changes the household saved from last time. The changes are a draft
 * until "Update", so the form behind never shows a half-changed household as ready to join, and
 * "Cancel" puts the guest back at the summary exactly as they left it.
 */
export const ChangeHouseholdDialog = observer(function ChangeHouseholdDialog() {
	const { registration } = useRootStore();
	const strings = useTranslation().guestView.forms.savedHousehold;
	const draft = registration.householdDraft;

	return (
		<Dialog
			open={draft !== null}
			title={strings.changeHeading}
			closeLabel={strings.close}
			onClose={() => registration.cancelHouseholdChange()}
			actions={
				<>
					<Button variant="outlined" onClick={() => registration.cancelHouseholdChange()}>
						{strings.cancel}
					</Button>
					<Button
						variant="contained"
						disabled={!registration.canApplyHouseholdDraft}
						onClick={() => registration.applyHouseholdDraft()}
					>
						{strings.update}
					</Button>
				</>
			}
		>
			{draft ? (
				<Fields>
					<HouseholdFields
						values={draft}
						onChange={(patch) => registration.updateHouseholdDraft(patch)}
					/>
				</Fields>
			) : null}
		</Dialog>
	);
});
