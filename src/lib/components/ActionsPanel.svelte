<script lang="ts">
	import { wsStore } from '$lib/stores/websocket.svelte.js';
	import {
		createStartCookV1Command,
		createStartCookV2Command,
		createStopCookCommand,
	} from '$lib/anova.js';
  import type { StartCookV1Stage, StartCookV2Stage } from '$lib/types';

	interface Props {
		deviceId: string;
		deviceVersion: 'v1' | 'v2';
		hasActiveHeatingElement: boolean;
		buildStageData: () => StartCookV1Stage | StartCookV2Stage;
		lastResult: { success: boolean; error?: string } | null;
		wsConnected: boolean;
		wsError: string | null;
		onResultChange: (result: { success: boolean; error?: string } | null) => void;
	}

	let {
		deviceId,
		deviceVersion,
		hasActiveHeatingElement,
		buildStageData,
		lastResult,
		wsConnected,
		wsError,
		onResultChange
	}: Props = $props();

	function handleStartCook() {
		try {
			const stageData = buildStageData();
			const command = deviceVersion === 'v1'
				? createStartCookV1Command({ deviceId, stages: [stageData as StartCookV1Stage] })
				: createStartCookV2Command({ deviceId, stages: [stageData as StartCookV2Stage] });
			
			const sent = wsStore.sendCommand(command);
			if (sent) {
				onResultChange({ success: true });
			} else {
				onResultChange({ success: false, error: 'WebSocket not connected' });
			}
		} catch (error) {
			console.error('Error starting cook:', error);
			onResultChange({ success: false, error: 'Failed to start cook' });
		}
	}

	function handleStopCook() {
		try {
			const command = createStopCookCommand(deviceId);
			const sent = wsStore.sendCommand(command);
			
			if (sent) {
				onResultChange({ success: true });
			} else {
				onResultChange({ success: false, error: 'WebSocket not connected' });
			}
		} catch (error) {
			console.error('Error stopping cook:', error);
			onResultChange({ success: false, error: 'Failed to stop cook' });
		}
	}
</script>

<!-- WebSocket Connection Status -->
{#if !wsConnected}
	<section class="card connection-warning">
		<h2>Connection Status</h2>
		{#if wsError}
			<p class="error">✗ {wsError}</p>
		{:else}
			<p class="loading-state">Connecting to Anova...</p>
		{/if}
	</section>
{/if}

<section class="card">
	<h2>Actions</h2>
	<div class="button-group-vertical">
		<button
			type="button"
			class="btn-primary btn-action"
			disabled={!hasActiveHeatingElement || !wsConnected}
			onclick={handleStartCook}
		>
			Start Cook
		</button>
		<button
			type="button"
			class="btn-danger btn-action"
			disabled={!wsConnected}
			onclick={handleStopCook}
		>
			Stop Cook
		</button>
	</div>
</section>

<!-- Last Result -->
{#if lastResult}
	<section class="card">
		<h2>Last Result</h2>
		{#if lastResult.success}
			<p class="success">✓ Command sent successfully</p>
		{:else}
			<p class="error">✗ Error: {lastResult.error || 'Unknown error'}</p>
		{/if}
	</section>
{/if}

