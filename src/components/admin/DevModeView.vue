<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { adminTranslations } from '../../adminLocales';
import type { Locale } from '../../locales';
import { serviceProgressLevels, type ServiceProgress } from '../../services/demoScenario';
import { sessionStatuses, type SessionStatus } from '../../services/sessionStateMachine';
import { useRootStore } from '../../stores/root.store';
import AppButton from '../AppButton.vue';

/**
 * Loads fake data staged at a chosen point on the session lifecycle, for demos and screenshots.
 * Only ever offered to a worker holding `manage:demo-data` (see `types.ts`'s `viewPermissions`),
 * and even then the server may have the feature turned off entirely — see `docs/roles.md`.
 *
 * Checking whether the tool is enabled is this view's own concern, the same way `ReportsView` owns
 * its own fetching; actually loading a scenario is not, since it changes the session every other
 * screen reads — that stays a container action in `AdminDashboard.vue`, same as `runMarketAction`.
 */

const props = defineProps<{
	locale: Locale;
	busy?: boolean;
}>();
const emit = defineEmits<{
	load: [stage: SessionStatus, serviceProgress: ServiceProgress | undefined];
}>();

const { admin } = useRootStore();
const t = computed(() => adminTranslations[props.locale]);
/** `null` while still checking. */
const enabled = ref<boolean | null>(null);

const stageTitles = computed<Record<SessionStatus, string>>(() => ({
	draft: t.value.devStageDraftTitle,
	scheduled: t.value.devStageScheduledTitle,
	registration_open: t.value.devStageRegistrationOpenTitle,
	registration_closed: t.value.devStageRegistrationClosedTitle,
	service_started: t.value.devStageServiceStartedTitle,
	ended: t.value.devStageEndedTitle,
}));
const stageDescriptions = computed<Record<SessionStatus, string>>(() => ({
	draft: t.value.devStageDraftDescription,
	scheduled: t.value.devStageScheduledDescription,
	registration_open: t.value.devStageRegistrationOpenDescription,
	registration_closed: t.value.devStageRegistrationClosedDescription,
	service_started: t.value.devStageServiceStartedDescription,
	ended: t.value.devStageEndedDescription,
}));
const progressLabels = computed<Record<ServiceProgress, string>>(() => ({
	just_started: t.value.devProgressJustStarted,
	halfway: t.value.devProgressHalfway,
	nearly_done: t.value.devProgressNearlyDone,
}));

async function checkEnabled() {
	enabled.value = await admin.isDemoDataEnabled();
}

onMounted(checkEnabled);
</script>

<template>
	<section class="admin-section action-card">
		<p>{{ t.devModeIntro }}</p>

		<p v-if="enabled === false" class="admin-feedback" role="status">{{ t.devModeDisabled }}</p>

		<div v-else-if="enabled" class="dev-scenario-list">
			<article v-for="stage in sessionStatuses" :key="stage" class="dev-scenario">
				<div>
					<strong>{{ stageTitles[stage] }}</strong>
					<p>{{ stageDescriptions[stage] }}</p>
				</div>
				<!-- `service_started` covers the most ground of any status, so it gets one button per
				     progress level instead of a single "load" button. -->
				<div v-if="stage === 'service_started'" class="dev-progress-actions">
					<AppButton
						v-for="progress in serviceProgressLevels"
						:key="progress"
						type="button"
						variant="secondary"
						:disabled="busy"
						@click="emit('load', 'service_started', progress)"
					>
						{{ progressLabels[progress] }}
					</AppButton>
				</div>
				<AppButton
					v-else
					type="button"
					variant="secondary"
					:disabled="busy"
					@click="emit('load', stage, undefined)"
				>
					{{ t.devModeLoad }}
				</AppButton>
			</article>
		</div>
	</section>
</template>

<style scoped>
.dev-scenario-list {
	display: grid;
	gap: 12px;
	margin-top: 18px;
}
.dev-scenario {
	display: grid;
	gap: 12px;
	padding: 18px;
	border: 1.5px solid #c7d2cc;
	border-radius: var(--radius-md);
}
.dev-scenario > div > p {
	margin-top: 4px;
	color: var(--color-text-subtle);
	font-size: 13px;
	line-height: 1.5;
}
.dev-progress-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
}
@media (min-width: 860px) {
	.dev-scenario {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
	}
}
</style>
