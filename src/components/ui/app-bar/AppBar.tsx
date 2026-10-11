import styled from '@emotion/styled';
import MuiAppBar from '@mui/material/AppBar';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import { observer } from 'mobx-react-lite';
import { type ChangeEvent, useState } from 'react';
import { Link } from 'react-router';

import { languages } from '../../../locales';
import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import type { Language } from '../../../stores/translation.store';
import { appBarLanguagePickerId, useLanguageChoice } from '../../hooks/use-language-choice';
import { HelpIcon } from '../icons/HelpIcon';
import { TranslateIcon } from '../icons/TranslateIcon';
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

/**
 * The language picker is an icon, not the current language's name: a guest who can read the
 * current language doesn't need it named, and one who can't needs a mark they recognize. The real
 * control is a transparent native select stretched over the icon, so a tap opens the phone's own
 * picker and assistive technology meets an ordinary labelled select.
 */
const LanguagePicker = styled.div`
	position: relative;
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 48px;
	height: 48px;
	border-radius: 50%;
	color: var(--color-on-brand);

	&:hover {
		background: rgb(255 255 255 / 0.08);
	}

	/* Chrome counts a select as keyboard-focused even after a click or tap, so :focus-visible
	   alone would leave the ring on; data-pointer marks a picker reached by pointer instead. */
	&:not([data-pointer]):has(select:focus-visible) {
		outline: 3px solid var(--color-focus);
		outline-offset: 2px;
	}

	select {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
		/* Below 16px, iOS zooms the page when the select takes focus. */
		font-size: 16px;
	}
`;

const Actions = styled.div`
	display: flex;
	align-items: center;
	gap: 4px;
	flex-shrink: 0;
`;

/** Shared branding, guest language selection, and secondary navigation. */
export const AppBar = observer(function AppBar({
	brandTo = '/',
	showLanguagePicker = true,
}: {
	brandTo?: string;
	showLanguagePicker?: boolean;
}) {
	const t = useTranslation();
	const { help } = t;
	const { guest, translations } = useRootStore();
	const chooseLanguage = useLanguageChoice();
	const [pickedByPointer, setPickedByPointer] = useState(false);

	function setLocale(event: ChangeEvent<HTMLSelectElement>) {
		chooseLanguage(event.target.value as Language);
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
				<Brand to={brandTo}>
					<img src="/bay-compassion-logo.png" alt="" />
					<span>{t.marketName}</span>
				</Brand>
				<Actions>
					<IconButton
						component={Link}
						to="/help"
						color="inherit"
						aria-label={help.title}
						data-tour="help"
					>
						<HelpIcon />
					</IconButton>
					{showLanguagePicker ? (
						<LanguagePicker
							data-tour="language"
							data-pointer={pickedByPointer || undefined}
							onPointerDown={() => setPickedByPointer(true)}
							// The first-visit introduction holds this name until it is dismissed; two
							// elements sharing it would cancel the transition that folds one into the other.
							style={{
								viewTransitionName: guest.isReturningVisitor ? 'language-picker' : undefined,
							}}
						>
							<TranslateIcon aria-hidden="true" />
							<select
								id={appBarLanguagePickerId}
								aria-label={t.language}
								data-sentry-unmask
								value={translations.locale}
								onChange={setLocale}
								onBlur={() => setPickedByPointer(false)}
							>
								{languages.map((language) => (
									<option key={language.code} value={language.code}>
										{language.label}
									</option>
								))}
							</select>
						</LanguagePicker>
					) : null}
					<AppBarMenu />
				</Actions>
			</Toolbar>
		</MuiAppBar>
	);
});
