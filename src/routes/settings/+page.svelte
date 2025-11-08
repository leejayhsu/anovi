<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { deviceConfig } from '$lib/stores/device.js';

	let { data } = $props();

	// Device configuration from store
	let deviceId = $state('');
	let deviceVersion = $state<'v1' | 'v2'>('v2');
	let refreshingDevices = $state(false);
	let lastResult = $state<{ success: boolean; error?: string } | null>(null);
	let tokenInput = $state('');
	let showTokenForm = $state(false);

	// Sync with store
	$effect(() => {
		const unsubscribe = deviceConfig.subscribe((config) => {
			deviceId = config.deviceId;
			deviceVersion = config.deviceVersion;
		});
		return unsubscribe;
	});

	// Auto-select device version based on discovered devices
	$effect(() => {
		if (data.discoveredDevices && data.discoveredDevices.length > 0 && !deviceId) {
			const firstDevice = data.discoveredDevices[0];
			deviceId = firstDevice.cookerId;
			deviceVersion = firstDevice.type === 'oven_v1' ? 'v1' : 'v2';
			deviceConfig.set({ deviceId, deviceVersion });
		}
	});

	// Update device version when device ID changes
	$effect(() => {
		if (deviceId && data.discoveredDevices) {
			const selectedDevice = data.discoveredDevices.find((d) => d.cookerId === deviceId);
			if (selectedDevice) {
				const version = selectedDevice.type === 'oven_v1' ? 'v1' : 'v2';
				if (deviceVersion !== version) {
					deviceVersion = version;
					deviceConfig.set({ deviceId, deviceVersion });
				}
			}
		}
	});

	function updateDeviceConfig() {
		deviceConfig.set({ deviceId, deviceVersion });
	}
</script>

<svelte:head>
	<title>Settings - Anova Oven Remote Control</title>
</svelte:head>

<div class="container">
	<header>
		<h1>Settings</h1>
	</header>

	<div class="main-content">
		<!-- Token Configuration -->
		<section class="card">
			<h2>Token Configuration</h2>
			{#if data.tokenStatus.isFromEnv}
				<div class="env-token-notice">
					<p class="info-message">
						✓ Token is configured via environment variable (<code>ANOVA_TOKEN</code> or
						<code>ANOVA_PERSONAL_ACCESS_TOKEN</code>)
					</p>
					<p class="helper-text">
						To use database storage instead, remove the environment variable and restart the
						application.
					</p>
				</div>
			{:else if showTokenForm || !data.tokenStatus.hasToken}
				<form
					method="POST"
					action="?/setToken"
					use:enhance={() => {
						return async ({ result, update }) => {
							await update();
							if (result.type === 'success' && result.data?.success) {
								showTokenForm = false;
								tokenInput = '';
								await invalidateAll();
							} else if (result.type === 'failure' && result.data) {
								lastResult = result.data as { success: boolean; error?: string };
							}
						};
					}}
				>
					<div class="form-group">
						<label for="token">Personal Access Token</label>
						<input
							id="token"
							name="token"
							type="password"
							bind:value={tokenInput}
							placeholder="Enter your Anova personal access token"
							required
						/>
					</div>
					<div class="form-group">
						<button type="submit">Save Token</button>
						{#if data.tokenStatus.hasToken}
							<button type="button" class="btn-secondary" onclick={() => (showTokenForm = false)}>
								Cancel
							</button>
						{/if}
					</div>
					{#if lastResult && !lastResult.success && lastResult.error}
						<p class="error">{lastResult.error}</p>
					{/if}
				</form>
			{:else}
				<p>Token is configured ✓</p>
				<div class="form-group">
					<button type="button" onclick={() => (showTokenForm = true)}> Update Token </button>
				</div>
			{/if}
		</section>

		<!-- Device Configuration -->
		<section class="card">
			<h2>Device Configuration</h2>
			{#if data.tokenStatus.hasToken}
				<div class="form-group">
					<form
						method="POST"
						action="?/refreshDevices"
						use:enhance={() => {
							return async ({ result, update }) => {
								refreshingDevices = true;
								await update();
								refreshingDevices = false;
								if (result.type === 'success' && result.data) {
									await invalidateAll();
									if (result.data.success) {
										lastResult = { success: true };
									} else {
										lastResult = result.data as { success: boolean; error?: string };
									}
								}
							};
						}}
					>
						<button type="submit" disabled={refreshingDevices} class="btn-secondary">
							{refreshingDevices ? 'Refreshing...' : 'Refresh Devices'}
						</button>
					</form>
				</div>
			{/if}
			{#if data.discoveredDevices && data.discoveredDevices.length > 0}
				<div class="form-group">
					<label for="device-select">Select Device</label>
					<select id="device-select" bind:value={deviceId} onchange={updateDeviceConfig}>
						<option value="">-- Select a device --</option>
						{#each data.discoveredDevices as device}
							<option value={device.cookerId}>
								{device.name} ({device.type === 'oven_v1' ? 'v1' : 'v2'})
							</option>
						{/each}
					</select>
				</div>
			{/if}
			<div class="form-group">
				<label for="device-id">Device ID</label>
				<input
					id="device-id"
					type="text"
					bind:value={deviceId}
					placeholder="Enter device ID or select from discovered devices"
					onblur={updateDeviceConfig}
				/>
			</div>
			<div class="form-group">
				<label for="device-version">Device Version</label>
				<select id="device-version" bind:value={deviceVersion} onchange={updateDeviceConfig}>
					<option value="v1">Oven v1</option>
					<option value="v2">Oven v2</option>
				</select>
			</div>
			{#if data.discoveredDevices && data.discoveredDevices.length === 0 && data.tokenStatus.hasToken}
				<p class="helper-text">
					No devices discovered yet. Make sure your oven is powered on and connected to Wi-Fi. Click
					"Refresh Devices" to search again.
				</p>
			{/if}
		</section>

		<!-- Last Result -->
		{#if lastResult}
			<section class="card">
				<h2>Last Action Result</h2>
				{#if lastResult.success}
					<p class="success">✓ Command sent successfully</p>
				{:else}
					<p class="error">✗ Error: {lastResult.error || 'Unknown error'}</p>
				{/if}
			</section>
		{/if}
	</div>
</div>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid #e0e0e0;
	}

	h1 {
		margin: 0;
		color: #333;
	}

	.main-content {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.card {
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 1.5rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.card h2 {
		margin-top: 0;
		margin-bottom: 1rem;
		font-size: 1.25rem;
		color: #333;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #555;
	}

	.form-group input[type='text'],
	.form-group input[type='number'],
	.form-group input[type='password'],
	.form-group select {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 1rem;
	}

	.helper-text {
		display: block;
		font-size: 0.875rem;
		color: #666;
		margin-top: 0.25rem;
	}

	button {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		cursor: pointer;
		background-color: #007bff;
		color: white;
		transition: background-color 0.2s;
	}

	button:hover {
		background-color: #0056b3;
	}

	button:active {
		transform: scale(0.98);
	}

	.form-group button {
		margin-right: 0.5rem;
	}

	.form-group button:last-child {
		margin-right: 0;
	}

	.btn-secondary {
		background-color: #6c757d;
	}

	.btn-secondary:hover {
		background-color: #5a6268;
	}

	.btn-secondary:disabled {
		background-color: #6c757d;
		opacity: 0.6;
		cursor: not-allowed;
	}

	.success {
		color: #28a745;
		font-weight: 500;
	}

	.error {
		color: #dc3545;
		font-weight: 500;
	}

	.env-token-notice {
		padding: 1rem;
		background: #e7f3ff;
		border: 1px solid #b3d9ff;
		border-radius: 4px;
	}

	.info-message {
		margin: 0 0 0.5rem 0;
		color: #004085;
		font-weight: 500;
	}

	.info-message code {
		background: #fff;
		padding: 0.125rem 0.25rem;
		border-radius: 3px;
		font-family: 'Monaco', 'Courier New', monospace;
		font-size: 0.9em;
	}

	@media (max-width: 768px) {
		.main-content {
			grid-template-columns: 1fr;
		}
	}
</style>
