import { runInAction } from 'mobx';

import { makeReactive } from '../services/make-reactive';
import type { WorkerAccount, WorkerPage, WorkerRole } from '../services/workers';
import type { RootStore } from './root.store';

export class WorkersStore {
	workers: WorkerAccount[] = [];
	page = 0;
	hasMore = false;
	busy = false;
	error = '';

	constructor(
		private readonly root: RootStore,
		private readonly request: typeof fetch = fetch,
	) {
		makeReactive(this, { root: false, request: false });
	}

	async load(page = this.page): Promise<void> {
		if (this.busy) {
			return;
		}
		this.busy = true;
		this.error = '';

		try {
			await this.readPage(page);
		} catch (error) {
			runInAction(() => {
				this.workers = [];
				this.error = this.message(error);
			});
		} finally {
			runInAction(() => {
				this.busy = false;
			});
		}
	}

	private async readPage(page: number): Promise<void> {
		const data = await this.send<WorkerPage>(`?page=${page}`);

		runInAction(() => {
			this.workers = data.workers;
			this.page = data.page;
			this.hasMore = data.hasMore;
		});
	}

	async add(name: string, email: string, role: WorkerRole): Promise<boolean> {
		return this.mutate(
			'',
			{ name, email, role },
			'POST',
			'Account added. Ask the worker to choose Forgot Password on the sign-in page to set their password.',
		);
	}

	async change(worker: WorkerAccount, command: WorkerRole | 'remove'): Promise<void> {
		const confirmed = await this.root.confirmation.ask({
			question:
				command === 'remove'
					? `Remove access for ${worker.email}?`
					: `Give ${worker.email} ${command} access?`,
			details: [
				command === 'remove'
					? 'This blocks sign-in. The account is kept and can be restored.'
					: 'Admins can manage other workers and admins.',
			],
			confirmLabel: command === 'remove' ? 'Remove Access' : 'Change Access',
			dismissLabel: 'Cancel',
			destructive: command === 'remove',
		});

		if (confirmed) {
			await this.mutate(
				`/${encodeURIComponent(worker.id)}`,
				{ command },
				'PATCH',
				'Worker access updated.',
			);
		}
	}

	private async mutate(
		path: string,
		body: object,
		method: string,
		success: string,
	): Promise<boolean> {
		if (this.busy) {
			return false;
		}
		this.busy = true;
		let changed = false;

		try {
			await this.send(path, method, body);
			changed = true;
			this.root.notifications.success(success);
			await this.readPage(this.page);

			return true;
		} catch (error) {
			this.root.notifications.error(this.message(error));
			runInAction(() => {
				this.workers = [];
				this.error = 'Refresh the staff list before making another change.';
			});

			// A failed refresh must not invite a second creation after the write succeeded.
			return changed;
		} finally {
			runInAction(() => {
				this.busy = false;
			});
		}
	}

	private message(error: unknown): string {
		return error instanceof Error ? error.message : 'Worker management is unavailable.';
	}

	private async send<T>(path: string, method = 'GET', body?: object): Promise<T> {
		const headers = new Headers(await this.root.requestHeaders());

		headers.set('Content-Type', 'application/json');
		const response = await this.request(`/api/admin/workers${path}`, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		});

		if (!response.ok) {
			const data = (await response.json().catch(() => ({}))) as { error?: string };

			throw new Error(
				data.error ?? 'Worker management is unavailable. Refresh before trying again.',
			);
		}

		return (await response.json()) as T;
	}
}
