<script lang="ts">
	import { wsStore } from '$lib/stores/websocket.svelte.js';
	import { createStartCookV1Command, createStopCookCommand } from '$lib/anova.js';
	import type { StartCookV1Stage } from '$lib/types';
	import { OctagonX, Play } from 'lucide-svelte';

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

<section class="card actions-card">
	<div class="actions-icons">
		<span
			class="action-icon"
			class:disabled={!hasActiveHeatingElement || !wsConnected}
			onclick={hasActiveHeatingElement && wsConnected ? handleStartCook : undefined}
			role="button"
			tabindex="0"
		>
			<Play size={48} color="#28a745" />
		</span>
		<span
			class="action-icon"
			class:disabled={!wsConnected}
			onclick={wsConnected ? handleStopCook : undefined}
			role="button"
			tabindex="0"
		>
			<OctagonX size={48} color="#dc3545" />
		</span>
	</div>
</section>

<style>
	.actions-card {
		padding: 0.75rem;
	}

	.actions-icons {
		display: flex;
		gap: 2rem;
		justify-content: center;
		padding: 0.25rem 0;
	}

	.action-icon {
		cursor: pointer;
		transition: all 0.2s;
		display: inline-flex;
	}

	.action-icon.disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.action-icon:not(.disabled):hover {
		transform: scale(1.1);
	}

	.action-icon:not(.disabled):active {
		transform: scale(0.95);
	}
</style>
