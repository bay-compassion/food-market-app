import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import { useColorScheme } from '@mui/material/styles';
import { observer } from 'mobx-react-lite';

import { useTranslation } from '../../../stores/react/use-translation';
import { Dialog } from '../Dialog';

type ColorMode = 'system' | 'light' | 'dark';

const modes: readonly ColorMode[] = ['system', 'light', 'dark'];

function isColorMode(value: string): value is ColorMode {
	return (modes as readonly string[]).includes(value);
}

type ColorModeDialogProps = {
	open: boolean;
	onClose: () => void;
};

/**
 * The guest's choice of light, dark, or whatever this device is set to. It applies as soon as it
 * is picked and is remembered on this device; `AppThemeProvider` stores it, and
 * `public/color-mode.js` reads it back before the next page load paints.
 */
export const ColorModeDialog = observer(function ColorModeDialog({
	open,
	onClose,
}: ColorModeDialogProps) {
	const {
		appBar: { colorMode: t },
	} = useTranslation();
	const { mode, setMode } = useColorScheme();

	return (
		<Dialog open={open} title={t.title} closeLabel={t.close} onClose={onClose}>
			<RadioGroup
				aria-label={t.title}
				value={mode ?? 'system'}
				onChange={(event) => {
					if (isColorMode(event.target.value)) {
						setMode(event.target.value);
					}
				}}
				sx={{ gap: 1 }}
			>
				{modes.map((value) => (
					<FormControlLabel
						key={value}
						value={value}
						control={<Radio />}
						label={t[value]}
						sx={{ alignItems: 'center', minHeight: 44 }}
					/>
				))}
			</RadioGroup>
		</Dialog>
	);
});
