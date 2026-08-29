import { cleanup } from '@testing-library/react';
import { config } from '@vue/test-utils';
import { afterEach, beforeEach } from 'vitest';

import { RootStore, rootStoreKey } from '@/stores/root.store.ts';

/**
 * Component tests that mount through `@vue/test-utils` get a real `RootStore` for free, so
 * `useStore()` (and anything built on it, like `useTranslation()`) works without every test
 * having to provide one by hand. A test that needs a specific store — a seeded guest, a mocked
 * fetch tied to a particular instance — can still pass its own via `global.provide`, which
 * overrides this default.
 *
 * The store is built lazily, on first `mount()`, rather than in `beforeEach`. Several of its
 * constituent stores read `localStorage` synchronously in their constructor (device token, visit
 * token, ...); building the store eagerly here would race a test that seeds storage in its own
 * body, before mounting.
 */
let defaultStore: RootStore | null = null;

beforeEach(() => {
	defaultStore = null;
});

Object.defineProperty(config.global.provide, rootStoreKey as symbol, {
	configurable: true,
	enumerable: true,
	get: () => (defaultStore ??= new RootStore()),
});

/**
 * Unmounts anything left behind by `@testing-library/react`. Its automatic cleanup only registers
 * when Vitest's globals are enabled, and this project imports `afterEach` explicitly instead.
 */
afterEach(cleanup);
