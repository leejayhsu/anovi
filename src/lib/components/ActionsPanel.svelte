<script lang="ts">
	import { enhance } from '$app/forms';

	interface Props {
		deviceId: string;
		deviceVersion: 'v1' | 'v2';
		hasActiveHeatingElement: boolean;
		buildStageData: () => any;
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
		<form
			method="POST"
			action="?/startCook"
			use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success' && result.data) {
						onResultChange(result.data as { success: boolean; error?: string });
					}
				};
			}}
		>
			<input type="hidden" name="deviceId" value={deviceId} />
			<input type="hidden" name="deviceVersion" value={deviceVersion} />
			<input type="hidden" name="stageData" value={JSON.stringify(buildStageData())} />
			<button type="submit" class="btn-primary btn-action" disabled={!hasActiveHeatingElement}>
				Start Cook
			</button>
		</form>
		<form
			method="POST"
			action="?/stopCook"
			use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success' && result.data) {
						onResultChange(result.data as { success: boolean; error?: string });
					}
				};
			}}
		>
			<input type="hidden" name="deviceId" value={deviceId} />
			<button type="submit" class="btn-danger btn-action">Stop Cook</button>
		</form>
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

