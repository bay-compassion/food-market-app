<script setup lang="ts">
import type { TypeScaleProps } from './types';
import { useTokenValues } from './useTokenValues';

const props = defineProps<TypeScaleProps>();

const values = useTokenValues([props.token]);
</script>

<template>
	<div>
		<p class="family">
			<code>{{ token }}</code> — {{ values[token] || '…' }}
		</p>
		<div v-for="sample in samples" :key="sample.size + sample.usage" class="sample">
			<p
				class="specimen"
				:style="{
					fontFamily: `var(${token})`,
					fontSize: sample.size,
					fontWeight: sample.weight,
					textTransform: sample.uppercase ? 'uppercase' : 'none',
				}"
			>
				{{ sample.text }}
			</p>
			<p class="caption">{{ sample.size }} · {{ sample.weight }} · {{ sample.usage }}</p>
		</div>
	</div>
</template>

<style scoped>
.family {
	margin-bottom: 8px;
	color: var(--color-text-subtle);
	font-size: 13px;
}
.sample {
	padding: 18px 0;
	border-bottom: 1px solid #eef2f0;
}
.specimen {
	color: var(--color-text);
	line-height: 1.2;
}
.caption {
	margin-top: 8px;
	color: var(--color-text-subtle);
	font-size: 13px;
}
</style>
