import styled from '@emotion/styled';
import Button from '@mui/material/Button';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';
import { Link } from 'react-router';

import { languages } from '../../locales';
import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import { AppFooter } from '../AppFooter';
import { EyebrowLabel } from '../EyebrowLabel';
import { AppBar } from '../ui/app-bar/AppBar';
import { NotificationToasts } from '../ui/NotificationToasts';

const Page = styled.div`
	min-height: 100svh;
	background: var(--color-background);
`;

const Content = styled.main`
	display: grid;
	gap: 24px;
	width: min(100% - 36px, 560px);
	margin: 0 auto;
	padding-top: 24px;
`;

const Notice = styled.section`
	padding: 32px 22px;
	border-radius: var(--radius-lg);
	color: var(--color-on-brand);
	background: var(--color-brand);

	> p:not(.eyebrow) {
		margin-top: 20px;
		font-size: 17px;
		line-height: 1.65;
	}
`;

const LanguagePicker = styled.section`
	color: var(--color-brand);

	> p {
		margin-bottom: 12px;
		font-weight: 700;
	}
`;

const Pills = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
`;

const LanguagePill = styled.button`
	min-height: 44px;
	padding: 10px 16px;
	border: 1px solid var(--color-brand);
	border-radius: var(--radius-pill);
	color: var(--color-brand);
	background: var(--color-background);
	font-weight: 700;

	&:hover {
		background: var(--color-surface-soft);
	}

	&[aria-pressed='true'] {
		color: var(--color-on-brand);
		background: var(--color-brand);
	}
`;

const CurrentApp = styled.section`
	display: grid;
	gap: 16px;
	padding: 24px 22px;
	border: 1px solid var(--color-border);
	border-radius: var(--radius-lg);
	background: var(--color-surface-soft);

	h2 {
		color: var(--color-brand);
		font-family: var(--font-heading);
		font-size: 26px;
		line-height: 1.2;
	}

	p {
		font-size: 17px;
		line-height: 1.6;
	}
`;

/** The flyer destination before launch, with a clear path to the current app. */
export const HoldingPage = observer(function HoldingPage() {
	const t = useTranslation();
	const { translations } = useRootStore();
	const languageId = useId();
	const copy = t.holdingPage;

	return (
		<Page dir={translations.dir} lang={translations.locale}>
			<AppBar brandTo="/holding" showLanguagePicker={false} />
			<Content dir={translations.dir} lang={translations.locale}>
				<LanguagePicker aria-labelledby={languageId}>
					<p id={languageId}>{t.languagePrompt}</p>
					<Pills>
						{languages.map(({ code, label }) => (
							<LanguagePill
								key={code}
								type="button"
								lang={code}
								dir="auto"
								aria-pressed={translations.locale === code}
								onClick={() => translations.setLanguage(code)}
							>
								{label}
							</LanguagePill>
						))}
					</Pills>
				</LanguagePicker>
				<Notice aria-labelledby="holding-heading">
					<EyebrowLabel label={t.marketName} />
					<h1 id="holding-heading">{copy.heading}</h1>
					<p>{copy.instructions}</p>
				</Notice>
				<CurrentApp aria-labelledby="current-app-heading">
					<h2 id="current-app-heading">{copy.currentAppHeading}</h2>
					<p>{copy.currentAppDescription}</p>
					<Button
						variant="contained"
						href="https://qrq.app/107352"
						size="large"
						sx={{ minHeight: 48 }}
					>
						{copy.currentAppLink}
					</Button>
				</CurrentApp>
				<Button component={Link} to="/help" variant="outlined" size="large" sx={{ minHeight: 48 }}>
					{t.help.title}
				</Button>
			</Content>
			<AppFooter />
			<NotificationToasts />
		</Page>
	);
});
