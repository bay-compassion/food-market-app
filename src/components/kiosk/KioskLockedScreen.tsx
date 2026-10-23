import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useId, useState, type FormEvent } from 'react';

import { adminTranslations } from '../../adminLocales';
import { kioskUnlockCodePattern } from '../../services/kiosk-unlock';
import type { KioskStore } from '../../stores/kiosk.store';
import { KioskMessageLayout } from './KioskFrame';
import { KioskHeader } from './KioskHeader';

const Form = styled.form`
	display: grid;
	gap: 2.5vmin;
	justify-items: center;

	label {
		font-size: clamp(1.25rem, 3.5vmin, 2.5rem);
		font-weight: 600;
	}

	.kiosk-unlock-entry {
		display: flex;
		flex-wrap: wrap;
		gap: 2vmin;
		justify-content: center;
	}

	input {
		width: 8ch;
		padding: 1.5vmin 2vmin;
		border: 0.4vmin solid var(--color-on-brand);
		border-radius: var(--radius-lg);
		background: transparent;
		color: var(--color-on-brand);
		font: inherit;
		font-size: clamp(2rem, 6vmin, 5rem);
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.12em;
		text-align: center;
	}

	button {
		padding: 2vmin 5vmin;
		border: 0;
		border-radius: var(--radius-pill);
		background: var(--color-on-brand);
		color: var(--color-brand-dark);
		font-size: clamp(1.25rem, 3.5vmin, 2.5rem);
		font-weight: 700;
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.kiosk-unlock-error {
		margin: 0;
		font-size: clamp(1.25rem, 3.5vmin, 2.5rem);
		font-weight: 600;
	}
`;

/**
 * The display before a worker has unlocked it, or after its token lapsed: why it is blank, and
 * where to type the code from "Unlock a room display" on a phone.
 *
 * English only, from the admin copy. This is a gate in front of the board, there for whoever sets
 * the display up rather than for guests, so it has no rotating second language and no language row.
 */
export const KioskLockedScreen = observer(function KioskLockedScreen({
	store,
}: {
	store: KioskStore;
}) {
	const t = adminTranslations.en.kioskUnlock.display;
	const [code, setCode] = useState('');
	const inputId = useId();
	const errorId = useId();
	const failure = store.unlockFailure;

	function submit(event: FormEvent) {
		event.preventDefault();

		if (kioskUnlockCodePattern.test(code)) {
			void store.unlock(code).then(() => setCode(''));
		}
	}

	return (
		<>
			<KioskHeader />
			<KioskMessageLayout>
				<p>{t.locked}</p>
				<Form onSubmit={submit}>
					<label htmlFor={inputId}>{t.codeLabel}</label>
					<div className="kiosk-unlock-entry">
						<input
							id={inputId}
							value={code}
							onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
							inputMode="numeric"
							autoComplete="one-time-code"
							maxLength={6}
							aria-invalid={failure === 'wrong_code' || undefined}
							aria-describedby={failure ? errorId : undefined}
						/>
						<button
							type="submit"
							disabled={store.isUnlocking || !kioskUnlockCodePattern.test(code)}
						>
							{t.unlock}
						</button>
					</div>
					{failure ? (
						<p id={errorId} className="kiosk-unlock-error" role="alert">
							{failure === 'wrong_code' ? t.wrongCode : t.unlockFailed}
						</p>
					) : null}
				</Form>
			</KioskMessageLayout>
		</>
	);
});
