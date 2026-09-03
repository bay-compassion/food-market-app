import styled from '@emotion/styled';
import MuiAppBar from '@mui/material/AppBar';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import Toolbar from '@mui/material/Toolbar';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router';

import { languages } from '../../../locales';
import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import type { Language } from '../../../stores/translation.store';
import { AppBarMenu } from './AppBarMenu';

const Brand = styled(Link)`
	display: inline-flex;
	gap: 8px;
	align-items: center;
	min-width: 0;
	color: inherit;
	font-family: var(--font-heading);
	font-weight: 700;
	font-size: 14.5px;
	text-transform: uppercase;
	text-decoration: none;

	img {
		flex-shrink: 0;
		width: 28px;
		height: 28px;
		object-fit: contain;
		border-radius: var(--radius-sm);
	}
`;

const LanguagePicker = styled(Select)`
	flex-shrink: 0;
	color: var(--color-on-brand);
	font-size: 15px;
	font-weight: 600;

	/* Override MUI's native select padding so the chevron follows the writing direction. */
	&&& .MuiNativeSelect-select {
		min-height: 46px;
		padding: 0;
		padding-inline: 8px 24px;
		border-radius: var(--radius-sm);
		background: transparent;

		&:focus-visible {
			outline: 3px solid var(--color-focus);
			outline-offset: 2px;
		}
	}

	.MuiNativeSelect-icon {
		right: auto;
		inset-inline-end: 0;
		color: inherit;
	}

	option {
		color: var(--color-brand);
		background: var(--color-background);
	}
`;

const Actions = styled.div`
	display: flex;
	align-items: center;
	gap: 4px;
	flex-shrink: 0;
`;

/** Shared branding, guest language selection, and secondary navigation. */
export const AppBar = observer(function AppBar() {
	const t = useTranslation();
	const { guest, translations } = useRootStore();

	function setLocale(event: SelectChangeEvent<unknown>) {
		translations.setLanguage(event.target.value as Language);
	}

	return (
		<MuiAppBar
			className="topbar"
			position="sticky"
			elevation={0}
			sx={{ bgcolor: 'var(--color-brand)', color: 'var(--color-on-brand)' }}
		>
			<Toolbar
				disableGutters
				sx={{ minHeight: { xs: 60, sm: 60 }, px: '20px', gap: 1, justifyContent: 'space-between' }}
			>
				<Brand to="/">
					<img src="/bay-compassion-logo.png" alt="" />
					<span>{t.marketName}</span>
				</Brand>
				<Actions>
					{guest.isReturningVisitor ? (
						<LanguagePicker
							native
							variant="standard"
							disableUnderline
							value={translations.locale}
							inputProps={{ 'aria-label': t.language }}
							onChange={setLocale}
						>
							{languages.map((language) => (
								<option key={language.code} value={language.code}>
									{language.label}
								</option>
							))}
						</LanguagePicker>
					) : null}
					<AppBarMenu />
				</Actions>
			</Toolbar>
		</MuiAppBar>
	);
});
