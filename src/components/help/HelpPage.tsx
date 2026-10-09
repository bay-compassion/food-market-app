import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useLayoutEffect } from 'react';
import { useNavigate } from 'react-router';

import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import { BackButton } from '../ui/BackButton';
import { HelpStep } from './HelpStep';

const Page = styled.section`
	width: min(100% - 36px, 560px);
	margin: 0 auto;
	padding: 24px 0 48px;
`;

const Back = styled(BackButton)`
	margin-bottom: 20px;
`;

const Heading = styled.h1`
	color: var(--color-brand);
`;

const Intro = styled.div`
	display: grid;
	gap: 6px;
	margin-bottom: 28px;
	padding: 20px;
	border-radius: var(--radius-md);
	color: var(--color-on-brand);
	background: var(--color-brand);
	font-size: 18px;
	line-height: 1.4;
`;

const IntroHeading = styled.h2`
	font-size: 20px;
	line-height: 1.3;
`;

const StepsHeading = styled.h2`
	margin-bottom: 16px;
	color: var(--color-brand);
	font-family: var(--font-heading);
	font-size: 22px;
	text-transform: uppercase;
`;

const Steps = styled.ol`
	counter-reset: help-step;
	display: grid;
	gap: 22px;
	margin: 0 0 28px;
	padding: 0;
	list-style: none;
`;

const Notice = styled.p`
	margin-bottom: 20px;
	padding: 16px 18px;
	border: 2px solid var(--color-brand);
	border-radius: var(--radius-md);
	line-height: 1.45;
`;

const NeedHelp = styled.p`
	padding: 16px 18px;
	border-radius: var(--radius-md);
	background: var(--color-surface-soft);
	text-align: center;
	line-height: 1.45;
`;

/** How a market Saturday works, from signing up to shopping — the printed flyer, in the app. */
export const HelpPage = observer(function HelpPage() {
	const t = useTranslation();
	const { translations } = useRootStore();
	const navigate = useNavigate();
	const copy = t.help;

	// Reached from the menu or the footer, so it mounts with the previous screen's scroll position;
	// reset it before paint so the page never opens part-way down.
	useLayoutEffect(() => {
		window.scrollTo({ top: 0, behavior: 'instant' });
	}, []);

	return (
		// `lang` lets the step counter pick the digits the language writes (see `HelpStep`).
		<Page aria-labelledby="help-heading" lang={translations.locale}>
			<Back label={t.backToGuest} onClick={() => void navigate('/')} />
			<Heading id="help-heading">{copy.title}</Heading>

			<Intro>
				<IntroHeading>{copy.introHeading}</IntroHeading>
				<p>{copy.introBody}</p>
			</Intro>

			<StepsHeading>{copy.stepsHeading}</StepsHeading>
			<Steps>
				{copy.steps.map((step) => (
					<HelpStep key={step.title} {...step} />
				))}
			</Steps>

			<Notice>
				<strong>{copy.phoneNotice.heading}</strong> {copy.phoneNotice.body}
			</Notice>
			<NeedHelp>
				<strong>{copy.needHelp.heading}</strong> {copy.needHelp.body}
			</NeedHelp>
		</Page>
	);
});
