<script setup lang="ts">
import type { TokenTableProps } from './types';
import { useTokenValues } from './useTokenValues';

const props = defineProps<TokenTableProps>();

const values = useTokenValues(props.tokens.map(([token]) => token));

function sampleStyle(token: string) {
	return props.preview === 'color'
		? { background: `var(${token})` }
		: { borderRadius: `var(${token})` };
}
</script>

<template>
	<table class="token-table">
		<thead>
			<tr>
				<th><span class="sr-only">Sample</span></th>
				<th>Token</th>
				<th>Value</th>
				<th>Used for</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="[token, usage] in tokens" :key="token">
				<td>
					<div class="token-sample" :class="preview" :style="sampleStyle(token)"></div>
				</td>
				<td>
					<code>{{ token }}</code>
				</td>
				<td>
					<code>{{ values[token] || '—' }}</code>
				</td>
				<td>{{ usage }}</td>
			</tr>
		</tbody>
	</table>
</template>

<style scoped>
.token-table {
	width: 100%;
	border-collapse: collapse;
}
.token-table th {
	padding: 10px 12px;
	border-bottom: 2px solid #dce3df;
	color: var(--color-text-subtle);
	font-family: var(--font-heading);
	font-size: 12px;
	letter-spacing: 0.06em;
	text-align: start;
	text-transform: uppercase;
}
.token-table td {
	padding: 10px 12px;
	border-bottom: 1px solid #eef2f0;
	vertical-align: middle;
}
.token-table code {
	font-size: 13px;
}
.token-sample.color {
	width: 48px;
	height: 48px;
	border-radius: var(--radius-sm);
	box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15);
}
.token-sample.radius {
	width: 96px;
	height: 48px;
	background: var(--color-surface-soft);
	box-shadow: inset 0 0 0 1.5px var(--color-brand);
}
</style>
