<script lang="ts">
	import { wsStore } from '$lib/stores/websocket.svelte.js';
	import { createStartCookV1Command, createStopCookCommand } from '$lib/anova.js';
	import type { StartCookV1Stage } from '$lib/types';

	interface Props {
		deviceId: string;
		hasActiveHeatingElement: boolean;
		buildStageData: () => StartCookV1Stage;
		lastResult: { success: boolean; error?: string } | null;
		wsConnected: boolean;
		wsError: string | null;
		onResultChange: (result: { success: boolean; error?: string } | null) => void;
	}

	let {
		deviceId,
		hasActiveHeatingElement,
		buildStageData,
		lastResult,
		wsConnected,
		wsError,
		onResultChange
	}: Props = $props();

	// Start cook command for Oven v1
	function handleStartCook() {
		try {
			const stageData = buildStageData();
			const command = createStartCookV1Command({ deviceId, stages: [stageData] });

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
