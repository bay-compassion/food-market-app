import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import { EyebrowLabel } from '../EyebrowLabel';

const Page = styled.main`
	display: grid;
	align-content: start;
	min-height: 100svh;
	padding: 24px 18px;
	background: var(--color-background);
`;

const Notice = styled.section`
	display: grid;
	gap: 20px;
	width: 100%;
	max-width: 560px;
	margin: 0 auto;
	padding: 32px 22px;
	border-radius: var(--radius-lg);
	color: var(--color-on-brand-surface);
	background: var(--color-brand-surface);

	> p:not(.eyebrow) {
		font-size: 17px;
		line-height: 1.65;
	}
`;

const ReloadButton = styled.button`
	justify-self: start;
	min-height: 48px;
	padding: 12px 24px;
	border: 0;
	border-radius: var(--radius-pill);
	color: var(--color-brand-surface);
	background: var(--color-on-brand-surface);
	font: inherit;
	font-weight: 700;
`;

/**
 * What a guest sees in place of a screen that crashed, rather than a blank page.
 *
 * It renders both inside and outside the router and the theme — `AppErrorBoundary` puts it above
 * every provider but the store — so it uses no router hook, no MUI component, and nothing from the
 * app shell, whose own failure may be the reason it is showing. The failure itself has already
 * gone to Sentry through `createRoot`'s error callbacks.
 */
export const AppErrorPage = observer(function AppErrorPage() {
	const t = useTranslation();
	const { translations } = useRootStore();
	const copy = t.appError;

	return (
		<Page dir={translations.dir} lang={translations.locale}>
			<Notice role="alert" aria-labelledby="app-error-heading">
				<div>
					<EyebrowLabel label={t.marketName} />
					<h1 id="app-error-heading">{copy.heading}</h1>
				</div>
				<p>{copy.description}</p>
				<ReloadButton type="button" onClick={() => window.location.reload()}>
					{copy.reload}
				</ReloadButton>
			</Notice>
		</Page>
	);
});
