import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { Dialog } from '../components/ui/Dialog';

let showModal: Mock<(this: HTMLDialogElement) => void>;

beforeEach(() => {
	showModal = vi.fn(function (this: HTMLDialogElement) {
		this.setAttribute('open', '');
	});
	HTMLDialogElement.prototype.showModal = showModal;
});

/** A host that owns `open`, the way every real caller does. */
function Host({ initialOpen, onClose }: { initialOpen: boolean; onClose?: () => void }) {
	const [open, setOpen] = useState(initialOpen);

	return (
		<>
			<button type="button" onClick={() => setOpen(true)}>
				Open it
			</button>
			<Dialog
				open={open}
				title="Consent form"
				closeLabel="Close consent form"
				onClose={() => {
					setOpen(false);
					onClose?.();
				}}
				actions={<button>Save</button>}
			>
				<p>Dialog body</p>
			</Dialog>
		</>
	);
}

describe('Dialog', () => {
	it('does not mount or activate until opened', async () => {
		const user = userEvent.setup();

		render(<Host initialOpen={false} />);

		expect(document.querySelector('dialog')).toBeNull();
		expect(showModal).not.toHaveBeenCalled();

		await user.click(screen.getByRole('button', { name: 'Open it' }));

		const dialog = document.querySelector('dialog')!;

		expect(showModal).toHaveBeenCalledOnce();
		expect(dialog.getAttribute('open')).not.toBeNull();
		expect(dialog.getAttribute('aria-labelledby')).toBe(
			screen.getByRole('heading', { name: 'Consent form' }).id,
		);
		expect(dialog.textContent).toContain('Dialog body');
		expect(document.querySelector('.dialog-actions')!.textContent).toContain('Save');
	});

	it('requests to close from its button, Escape, and the backdrop', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();

		// Rendered directly rather than through `Host`, so the dialog stays open across all three
		// and each one is counted.
		render(
			<Dialog open title="Consent form" closeLabel="Close consent form" onClose={onClose}>
				<p>Dialog body</p>
			</Dialog>,
		);

		const dialog = document.querySelector('dialog')!;

		await user.click(screen.getByRole('button', { name: 'Close consent form' }));
		dialog.dispatchEvent(new Event('cancel', { bubbles: true, cancelable: true }));
		// A click landing on the element itself, rather than its panel, is a backdrop click.
		dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		expect(onClose).toHaveBeenCalledTimes(3);
	});

	it('unmounts when its controlled open state closes', async () => {
		const user = userEvent.setup();

		render(<Host initialOpen />);

		expect(document.querySelector('dialog')).not.toBeNull();

		await user.click(screen.getByRole('button', { name: 'Close consent form' }));

		expect(document.querySelector('dialog')).toBeNull();
	});
});
