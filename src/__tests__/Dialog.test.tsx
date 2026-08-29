import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Dialog } from '../components/ui/Dialog';

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

		expect(screen.queryByRole('dialog')).toBeNull();

		await user.click(screen.getByRole('button', { name: 'Open it' }));

		const dialog = screen.getByRole('dialog');

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

		await user.click(screen.getByRole('button', { name: 'Close consent form' }));
		await user.keyboard('{Escape}');
		await user.click(document.querySelector<HTMLElement>('.MuiBackdrop-root')!);

		expect(onClose).toHaveBeenCalledTimes(3);
	});

	it('unmounts when its controlled open state closes', async () => {
		const user = userEvent.setup();

		render(<Host initialOpen />);

		expect(screen.getByRole('dialog')).toBeDefined();

		await user.click(screen.getByRole('button', { name: 'Close consent form' }));

		expect(screen.queryByRole('dialog')).toBeNull();
	});
});
