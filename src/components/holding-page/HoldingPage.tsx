import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';

import { isLocale, languages } from '../../locales';
import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import { EyebrowLabel } from '../EyebrowLabel';

const Page = styled.main`
	min-height: 100svh;
	padding: 40px 18px;
	background: var(--color-surface-soft);
`;

const Content = styled.div`
	width: 100%;
	max-width: 480px;
	margin: 0 auto;

	> img {
		display: block;
		width: 72px;
		height: 72px;
		margin-bottom: 24px;
		border-radius: var(--radius-md);
	}
`;

const Notice = styled.section`
	padding: 32px 24px;
	border-radius: var(--radius-lg);
	color: var(--color-on-brand);
	background: var(--color-brand);

	> p:not(.eyebrow) {
		margin-top: 20px;
		font-size: 17px;
		line-height: 1.65;
	}
`;

const LanguagePicker = styled.div`
	display: grid;
	gap: 12px;
	margin-top: 28px;
	color: var(--color-brand);

	label {
		font-weight: 700;
	}

	select {
		width: 100%;
		min-height: 48px;
		padding: 12px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text);
		background: var(--color-background);
	}
`;

/** The flyer destination before launch, with no navigation into guest registration. */
export const HoldingPage = observer(function HoldingPage() {
	const t = useTranslation();
	const { translations } = useRootStore();
	const languageId = useId();
	const copy = t.holdingPage;

	return (
		<Page dir={translations.dir} lang={translations.locale}>
			<Content>
				<img src="/bay-compassion-logo.png" alt="" />
				<Notice aria-labelledby="holding-heading">
					<EyebrowLabel label={t.marketName} />
					<h1 id="holding-heading">{copy.heading}</h1>
					<p>{copy.description}</p>
					<p>{copy.instructions}</p>
				</Notice>
				<LanguagePicker>
					<label htmlFor={languageId}>{t.languagePrompt}</label>
					<select
						id={languageId}
						value={translations.locale}
						onChange={(event) => {
							if (isLocale(event.target.value)) {
								translations.setLanguage(event.target.value);
							}
						}}
					>
						{languages.map(({ code, label }) => (
							<option key={code} value={code} lang={code}>
								{label}
							</option>
						))}
					</select>
				</LanguagePicker>
			</Content>
		</Page>
	);
});
