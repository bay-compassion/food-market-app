/**
 * Shapes shared between the admin components and their container.
 *
 * These live in a plain module rather than being exported from the `.vue` files that use them:
 * a type exported from `<script setup>` resolves through the wildcard `*.vue` shim in some of
 * this repo's TypeScript projects, so importing it fails under `oxlint` even though `vue-tsc`
 * accepts it.
 *
 * The definitions themselves now sit in `src/services/`, alongside the API client and the store
 * that produce them — a service must not import from `src/components/`. This module re-exports
 * them so the admin components keep one import path for the vocabulary of their screens.
 */

export type {
	AdminGuest,
	AdminMarketEvent,
	HistoricalEvent,
	ManualGuest,
	Question,
	QueueGuest,
} from '../../services/admin-api.ts';

export {
	adminViews,
	isAdminView,
	viewPermissions,
	viewsFor,
	type AdminView,
} from '../../services/admin-views.ts';

export type { SessionSettings } from '../../services/session-settings.ts';
