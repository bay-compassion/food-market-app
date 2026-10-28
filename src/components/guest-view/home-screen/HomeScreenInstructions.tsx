import styled from '@emotion/styled';
import { Button, IconButton } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { BottomSheet } from '../../ui/BottomSheet';

const Content = styled.div`
	h2 {
		margin: 0;
		padding-inline-end: 44px;
		font-family: var(--font-heading);
		font-size: 26px;
	}
	p,
	li {
		font-size: 16px;
		line-height: 1.55;
	}
	p {
		margin: 14px 0;
		color: var(--color-text-muted);
	}
	ol {
		display: grid;
		gap: 20px;
		margin: 24px 0;
		padding-inline-start: 24px;
	}
	.close-instructions {
		position: absolute;
		inset-inline-end: 12px;
		top: 12px;
		width: 44px;
		height: 44px;
	}
`;

export const HomeScreenInstructions = observer(function HomeScreenInstructions() {
	const { installation, translations } = useRootStore();
	const copy = useTranslation().guestView.homeScreen;
	const id = useId();

	return (
		<BottomSheet
			anchor="bottom"
			open={installation.instructionsOpen}
			onClose={() => installation.closeInstructions()}
			transitionDuration={0}
			slotProps={{
				paper: { role: 'dialog', 'aria-modal': true, 'aria-labelledby': id, dir: translations.dir },
			}}
		>
			<Content>
				<IconButton
					className="close-instructions"
					aria-label={copy.close}
					onClick={() => installation.closeInstructions()}
				>
					<span aria-hidden="true">×</span>
				</IconButton>
				<h2 id={id}>{copy.instructionsTitle}</h2>
				<p>{copy.instructionsDescription}</p>
				<ol>
					<li>{copy.shareStep}</li>
					<li>{copy.homeScreenStep}</li>
					<li>{copy.addStep}</li>
					<li>{copy.openStep}</li>
				</ol>
				<p>{copy.optional}</p>
				<Button fullWidth onClick={() => installation.closeInstructions()}>
					{copy.done}
				</Button>
			</Content>
		</BottomSheet>
	);
});
