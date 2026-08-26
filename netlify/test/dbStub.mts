import { vi } from 'vitest';

/**
 * A reusable stand-in for the Drizzle `db` client used by the Netlify function handlers.
 *
 * Handlers chain calls like `db.select({...}).from(x).where(y).limit(1)` and `await` the
 * result. This stub returns a chainable object from `select`/`insert`/`update`/`delete` whose
 * chained methods are no-ops that return the same object, and which resolves (via `.then`) to
 * the next value pushed with `queueResult`. Tests queue results in the same order the handler
 * under test will request them.
 *
 * `execute` is not chainable and resolves to whatever was queued. Queue the shape the real driver
 * returns — a result object like `{ rows: [...] }`, not a bare array — or a test will pass against
 * a shape production never produces.
 *
 * This is a module-level singleton (not a factory) so that `vi.mock('../../db/index.mjs', () =>
 * ({ db }))` and test bodies can share the same `db` reference without hoisting issues — import
 * it directly rather than constructing a new one per test, and call `resetDbStub()` in
 * `afterEach` to clear queued results and mock call history between tests.
 */

const queue: unknown[] = [];

function nextResult() {
	if (queue.length === 0) {
		throw new Error('dbStub: no queued result — call queueResult() before awaiting this call');
	}

	return queue.shift();
}

function chain() {
	const link: Record<string, unknown> = {};
	const chainedMethods = [
		'from',
		'innerJoin',
		'leftJoin',
		'where',
		'orderBy',
		'limit',
		'groupBy',
		'values',
		'set',
		'returning',
		'onConflictDoNothing',
		'onConflictDoUpdate',
	];

	for (const method of chainedMethods) {
		link[method] = vi.fn(() => link);
	}

	// Intentional: mimics Drizzle's own thenable query builder so handler code can
	// `await db.select(...).from(...).where(...)` unchanged.
	// oxlint-disable-next-line unicorn/no-thenable
	link.then = (onResolve: (value: unknown) => unknown, onReject?: (error: unknown) => unknown) => {
		try {
			return Promise.resolve(onResolve(nextResult()));
		} catch (error) {
			return onReject ? Promise.resolve(onReject(error)) : Promise.reject(error);
		}
	};

	return link;
}

export const db = {
	select: vi.fn(() => chain()),
	insert: vi.fn(() => chain()),
	update: vi.fn(() => chain()),
	delete: vi.fn(() => chain()),
	execute: vi.fn(() => nextResult()),
	transaction: vi.fn(async (callback: (tx: typeof db) => unknown) => callback(db)),
};

export function queueResult(result: unknown) {
	queue.push(result);
}

export function resetDbStub() {
	queue.length = 0;
	db.select.mockClear();
	db.insert.mockClear();
	db.update.mockClear();
	db.delete.mockClear();
	db.execute.mockClear();
	db.transaction.mockClear();
}
