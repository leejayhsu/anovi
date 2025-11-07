<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import {
		celsiusToFahrenheit,
		fahrenheitToCelsius,
		type StartCookV1Stage,
		type StartCookV2Stage
	} from '$lib/anova.js';
	import Dialpad from '$lib/components/Dialpad.svelte';

	let { data } = $props();

	// Device configuration
	let deviceId = $state('');
	let deviceVersion = $state<'v1' | 'v2'>('v2');
	
	// Auto-select device version based on discovered devices
	$effect(() => {
		if (data.discoveredDevices && data.discoveredDevices.length > 0 && !deviceId) {
			const firstDevice = data.discoveredDevices[0];
			deviceId = firstDevice.cookerId;
			deviceVersion = firstDevice.type === 'oven_v1' ? 'v1' : 'v2';
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
				}
			}
		}
	});

	// Temperature settings
	let temperatureMode = $state<'dry' | 'wet'>('dry');
	let temperatureCelsius = $state(180);
	let temperatureUnit = $state<'C' | 'F'>('F');

	// Heating elements
	let topElement = $state(false);
	let bottomElement = $state(false);
	let rearElement = $state(true);

	// Fan and vent
	let fanSpeed = $state(100);
	let ventOpen = $state(false);

	// Steam settings
	let steamMode = $state<'idle' | 'relative-humidity' | 'steam-percentage'>('idle');
	let steamSetpoint = $state(100);

	// Timer settings
	let timerEnabled = $state(false);
	let timerSeconds = $state(1800); // 30 minutes default
	let timerStartType = $state<'immediately' | 'when-preheated' | 'manual'>('immediately');

	// Probe settings
	let probeEnabled = $state(false);
	let probeSetpointCelsius = $state(65);

	// Rack position
	let rackPosition = $state(3);

	// Multi-stage cooking
	let multiStageEnabled = $state(false);
	let stages = $state<Array<{ id: string; title: string }>>([{ id: crypto.randomUUID(), title: 'Stage 1' }]);

	// Computed values
	let temperatureFahrenheit = $derived(celsiusToFahrenheit(temperatureCelsius));
	let displayTemperature = $derived(
		temperatureUnit === 'C' ? temperatureCelsius : temperatureFahrenheit
	);

	// UI state
	let lastResult = $state<{ success: boolean; error?: string } | null>(null);
	let tokenInput = $state('');
	let showTokenForm = $state(!data.tokenStatus.hasToken);
	let refreshingDevices = $state(false);
	
	// Modal and dialpad state
	let showTemperatureDialpad = $state(false);

	// Build stage data for form submission
	function buildStageData(): StartCookV1Stage | StartCookV2Stage {
		if (deviceVersion === 'v1') {
			return {
				stepType: 'stage',
				id: crypto.randomUUID(),
				title: '',
				description: '',
				type: 'cook',
				userActionRequired: false,
				temperatureBulbs: {
					mode: temperatureMode,
					...(temperatureMode === 'dry'
						? {
								dry: {
									setpoint: {
										celsius: temperatureCelsius,
										fahrenheit: temperatureFahrenheit
									}
								}
							}
						: {
								wet: {
									setpoint: {
										celsius: temperatureCelsius,
										fahrenheit: temperatureFahrenheit
									}
								}
							})
				},
				heatingElements: {
					top: { on: topElement },
					bottom: { on: bottomElement },
					rear: { on: rearElement }
				},
				fan: { speed: fanSpeed },
				vent: { open: ventOpen },
				rackPosition,
				stageTransitionType: 'automatic',
				...(steamMode !== 'idle' && {
					steamGenerators: {
						mode: steamMode,
						...(steamMode === 'relative-humidity'
							? { relativeHumidity: { setpoint: steamSetpoint } }
							: { steamPercentage: { setpoint: steamSetpoint } })
					}
				}),
				...(timerEnabled && {
					timer: {
						initial: timerSeconds,
						startType: timerStartType
					}
				}),
				...(probeEnabled && {
					probe: {
						setpoint: {
							celsius: probeSetpointCelsius,
							fahrenheit: celsiusToFahrenheit(probeSetpointCelsius)
						}
					}
				})
			} as StartCookV1Stage;
		} else {
			return {
				id: crypto.randomUUID(),
				do: {
					type: 'cook',
					fan: { speed: fanSpeed },
					heatingElements: {
						top: { on: topElement },
						bottom: { on: bottomElement },
						rear: { on: rearElement }
					},
					exhaustVent: { state: ventOpen ? 'open' : 'closed' },
					temperatureBulbs: {
						mode: temperatureMode,
						...(temperatureMode === 'dry'
							? { dry: { setpoint: { celsius: temperatureCelsius } } }
							: { wet: { setpoint: { celsius: temperatureCelsius } } })
					},
					...(steamMode !== 'idle' && {
						steamGenerators: {
							mode: steamMode,
							...(steamMode === 'relative-humidity'
								? { relativeHumidity: { setpoint: steamSetpoint } }
								: { steamPercentage: { setpoint: steamSetpoint } })
						}
					}),
					...(timerEnabled && {
						timer: {
							initial: timerSeconds
						}
					})
				},
				exit: { conditions: { and: {} } },
				entry: {
					conditions: {
						and: {
							[`nodes.temperatureBulbs.${temperatureMode}.current.celsius`]: {
								'>=': temperatureCelsius
							}
						}
					}
				},
				title: '',
				description: '',
				rackPosition
			} as StartCookV2Stage;
		}
	}

	// Format time
	function formatTime(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
		}
		return `${minutes}:${secs.toString().padStart(2, '0')}`;
	}

	// Validate heating elements (all can't be on/off at the same time)
	function validateHeatingElements() {
		const allOn = topElement && bottomElement && rearElement;
		const allOff = !topElement && !bottomElement && !rearElement;
		if (allOn || allOff) {
			alert('All heating elements cannot be on or off at the same time');
			return false;
		}
		return true;
	}

	// Handle temperature input from dialpad
	function handleTemperatureChange(value: number) {
		// Convert if needed based on current unit
		if (temperatureUnit === 'F') {
			// User entered Fahrenheit, convert to Celsius
			temperatureCelsius = fahrenheitToCelsius(value);
		} else {
			// User entered Celsius
			temperatureCelsius = value;
		}
	}

	// Handle temperature unit change - automatically set on device
	async function handleUnitChange(newUnit: 'C' | 'F') {
		temperatureUnit = newUnit;
		
		// Automatically set the unit on the device if device is selected
		if (deviceId) {
			try {
				const formData = new FormData();
				formData.append('deviceId', deviceId);
				formData.append('unit', newUnit);
				
				const response = await fetch('?/setTemperatureUnit', {
					method: 'POST',
					body: formData
				});
				
				if (response.ok) {
					const result = await response.json();
					if (result.type === 'success' && result.data) {
						lastResult = result.data as { success: boolean; error?: string };
					} else if (result.type === 'failure' && result.data) {
						lastResult = result.data as { success: boolean; error?: string };
					}
				}
			} catch (error) {
				console.error('Error setting temperature unit:', error);
				lastResult = { success: false, error: 'Failed to set temperature unit' };
			}
		}
	}

	// Get temperature display value for dialpad
	let dialpadTemperature = $derived(
		temperatureUnit === 'C' ? temperatureCelsius : temperatureFahrenheit
	);

	// Get temperature min/max for dialpad
	let dialpadMin = $derived(
		temperatureUnit === 'C'
			? (temperatureMode === 'wet' ? 25 : 25)
			: (temperatureMode === 'wet' ? 75 : 75)
	);
	let dialpadMax = $derived(
		temperatureUnit === 'C'
			? (temperatureMode === 'wet' ? 100 : 250)
			: (temperatureMode === 'wet' ? 212 : 482)
	);
</script>

<svelte:head>
	<title>Anova Oven Remote Control</title>
</svelte:head>

<div class="container">
	<header>
		<h1>Anova Precision Oven Remote Control</h1>
		<div class="connection-status">
			<span class="status-indicator" class:connected={data.tokenStatus.hasToken}></span>
			<span>{data.tokenStatus.hasToken ? 'Token Configured' : 'No Token'}</span>
		</div>
	</header>

	<div class="main-content">
		<!-- Token Configuration -->
		{#if showTokenForm || !data.tokenStatus.hasToken}
			<section class="card token-config">
				<h2>Configure Anova Token</h2>
				<form
					method="POST"
					action="?/setToken"
					use:enhance={() => {
						return async ({ result, update }) => {
							await update();
							if (result.type === 'success' && result.data?.success) {
								showTokenForm = false;
								await invalidateAll();
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
					</div>
				</form>
			</section>
		{:else}
			<section class="card token-config">
				<h2>Token Configuration</h2>
				<p>Token is configured ✓</p>
				<button type="button" onclick={() => (showTokenForm = true)}>
					Update Token
				</button>
			</section>
		{/if}

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
					<select
						id="device-select"
						bind:value={deviceId}
					>
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
				/>
			</div>
			<div class="form-group">
				<label for="device-version">Device Version</label>
				<select id="device-version" bind:value={deviceVersion}>
					<option value="v1">Oven v1</option>
					<option value="v2">Oven v2</option>
				</select>
			</div>
			{#if data.discoveredDevices && data.discoveredDevices.length === 0 && data.tokenStatus.hasToken}
				<p class="helper-text">
					No devices discovered yet. Make sure your oven is powered on and connected to Wi-Fi. Click "Refresh Devices" to search again.
				</p>
			{/if}
		</section>

		<!-- Temperature Control -->
		<section class="card">
			<h2>Temperature Control</h2>
			<div class="form-group">
				<label>Mode</label>
				<div class="toggle-group">
					<button
						type="button"
						class="toggle-button"
						class:active={temperatureMode === 'dry'}
						onclick={() => (temperatureMode = 'dry')}
					>
						Dry
					</button>
					<button
						type="button"
						class="toggle-button"
						class:active={temperatureMode === 'wet'}
						onclick={() => (temperatureMode = 'wet')}
					>
						Wet
					</button>
				</div>
			</div>
			<div class="form-group">
				<label>Temperature Unit</label>
				<div class="toggle-group">
					<button
						type="button"
						class="toggle-button"
						class:active={temperatureUnit === 'C'}
						onclick={() => handleUnitChange('C')}
					>
						Celsius
					</button>
					<button
						type="button"
						class="toggle-button"
						class:active={temperatureUnit === 'F'}
						onclick={() => handleUnitChange('F')}
					>
						Fahrenheit
					</button>
				</div>
			</div>
			<div class="form-group">
				<label>Temperature</label>
				<button
					type="button"
					class="temperature-button"
					onclick={() => (showTemperatureDialpad = true)}
				>
					<span class="temperature-value">{displayTemperature}</span>
					<span class="temperature-unit">{temperatureUnit === 'C' ? '°C' : '°F'}</span>
				</button>
				<span class="helper-text">
					{temperatureMode === 'wet'
						? (temperatureUnit === 'C' ? 'Range: 25-100°C' : 'Range: 75-212°F')
						: (temperatureUnit === 'C' ? 'Range: 25-250°C' : 'Range: 75-482°F')}
				</span>
			</div>
		</section>

		<!-- Modals and Dialpad -->
		{#if showTemperatureDialpad}
			<Dialpad
				value={dialpadTemperature}
				min={dialpadMin}
				max={dialpadMax}
				unit={temperatureUnit === 'C' ? '°C' : '°F'}
				onChange={handleTemperatureChange}
				onClose={() => (showTemperatureDialpad = false)}
			/>
		{/if}


		<!-- Heating Elements -->
		<section class="card">
			<h2>Heating Elements</h2>
			<div class="form-group">
				<label>
					<input type="checkbox" bind:checked={topElement} />
					Top Element
				</label>
			</div>
			<div class="form-group">
				<label>
					<input type="checkbox" bind:checked={bottomElement} />
					Bottom Element
				</label>
			</div>
			<div class="form-group">
				<label>
					<input type="checkbox" bind:checked={rearElement} />
					Rear Element
				</label>
			</div>
			<p class="helper-text">
				Note: All three elements cannot be on or off at the same time
			</p>
		</section>

		<!-- Fan & Vent -->
		<section class="card">
			<h2>Fan & Vent</h2>
			<div class="form-group">
				<label for="fan-speed">Fan Speed (%)</label>
				<input
					id="fan-speed"
					type="range"
					min="0"
					max="100"
					bind:value={fanSpeed}
				/>
				<span>{fanSpeed}%</span>
			</div>
			<div class="form-group">
				<label>
					<input type="checkbox" bind:checked={ventOpen} />
					Vent Open
				</label>
			</div>
		</section>

		<!-- Steam Control -->
		<section class="card">
			<h2>Steam Control</h2>
			<div class="form-group">
				<label for="steam-mode">Steam Mode</label>
				<select id="steam-mode" bind:value={steamMode}>
					<option value="idle">Idle</option>
					<option value="relative-humidity">Relative Humidity</option>
					<option value="steam-percentage">Steam Percentage</option>
				</select>
			</div>
			{#if steamMode !== 'idle'}
				<div class="form-group">
					<label for="steam-setpoint">
						{steamMode === 'relative-humidity' ? 'Humidity' : 'Steam'} Setpoint (%)
					</label>
					<input
						id="steam-setpoint"
						type="range"
						min="0"
						max="100"
						bind:value={steamSetpoint}
					/>
					<span>{steamSetpoint}%</span>
				</div>
			{/if}
		</section>

		<!-- Timer -->
		<section class="card">
			<h2>Timer</h2>
			<div class="form-group">
				<label>
					<input type="checkbox" bind:checked={timerEnabled} />
					Enable Timer
				</label>
			</div>
			{#if timerEnabled}
				<div class="form-group">
					<label for="timer-seconds">Duration (seconds)</label>
					<input
						id="timer-seconds"
						type="number"
						bind:value={timerSeconds}
						min="0"
						step="1"
					/>
					<span class="helper-text">{formatTime(timerSeconds)}</span>
				</div>
				<div class="form-group">
					<label for="timer-start-type">Start Type</label>
					<select id="timer-start-type" bind:value={timerStartType}>
						<option value="immediately">Immediately</option>
						<option value="when-preheated">When Preheated</option>
						<option value="manual">Manual</option>
					</select>
				</div>
			{/if}
		</section>

		<!-- Probe -->
		<section class="card">
			<h2>Temperature Probe</h2>
			<div class="form-group">
				<label>
					<input type="checkbox" bind:checked={probeEnabled} />
					Enable Probe
				</label>
			</div>
			{#if probeEnabled}
				<div class="form-group">
					<label for="probe-setpoint">Probe Setpoint (°C)</label>
					<input
						id="probe-setpoint"
						type="number"
						bind:value={probeSetpointCelsius}
						min="1"
						max="100"
						step="1"
					/>
					<span class="helper-text">
						Range: 1-100°C (33-212°F)
					</span>
				</div>
				<form
					method="POST"
					action="?/setProbe"
					use:enhance={() => {
						return async ({ result, update }) => {
							await update();
							if (result.type === 'success' && result.data) {
								lastResult = result.data as { success: boolean; error?: string };
							}
						};
					}}
				>
					<input type="hidden" name="deviceId" value={deviceId} />
					<input type="hidden" name="setpointCelsius" value={probeSetpointCelsius} />
					<input type="hidden" name="deviceVersion" value={deviceVersion} />
					<div class="form-group">
						<button type="submit">Set Probe</button>
					</div>
				</form>
			{/if}
		</section>

		<!-- Rack Position -->
		<section class="card">
			<h2>Rack Position</h2>
			<div class="form-group">
				<label for="rack-position">Position (1-5)</label>
				<input
					id="rack-position"
					type="number"
					bind:value={rackPosition}
					min="1"
					max="5"
					step="1"
				/>
			</div>
		</section>

		<!-- Control Buttons -->
		<section class="card actions">
			<h2>Actions</h2>
			<div class="button-group">
				<form
					method="POST"
					action="?/startCook"
					use:enhance={() => {
						return async ({ result, update }) => {
							await update();
							if (result.type === 'success' && result.data) {
								lastResult = result.data as { success: boolean; error?: string };
							}
						};
					}}
				>
					<input type="hidden" name="deviceId" value={deviceId} />
					<input type="hidden" name="deviceVersion" value={deviceVersion} />
					<input type="hidden" name="stageData" value={JSON.stringify(buildStageData())} />
					<button type="submit" class="btn-primary">Start Cook</button>
				</form>
				<form
					method="POST"
					action="?/stopCook"
					use:enhance={() => {
						return async ({ result, update }) => {
							await update();
							if (result.type === 'success' && result.data) {
								lastResult = result.data as { success: boolean; error?: string };
							}
						};
					}}
				>
					<input type="hidden" name="deviceId" value={deviceId} />
					<button type="submit" class="btn-danger">Stop Cook</button>
				</form>
			</div>
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
		font-family: system-ui, -apple-system, sans-serif;
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

	.connection-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status-indicator {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background-color: #ccc;
	}

	.status-indicator.connected {
		background-color: #4caf50;
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
	.form-group select {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 1rem;
	}

	.form-group input[type='range'] {
		width: 100%;
	}

	.form-group input[type='checkbox'] {
		margin-right: 0.5rem;
	}

	.select-button {
		width: 100%;
		padding: 1rem;
		border: 2px solid #ddd;
		border-radius: 8px;
		background: white;
		color: #333;
		font-size: 1rem;
		cursor: pointer;
		display: flex;
		justify-content: space-between;
		align-items: center;
		transition: all 0.2s;
		touch-action: manipulation;
		min-height: 56px;
	}

	.select-button:active {
		background: #f0f0f0;
		border-color: #007bff;
		transform: scale(0.98);
	}

	.chevron {
		color: #666;
		font-size: 0.875rem;
	}

	.toggle-group {
		display: flex;
		gap: 0.75rem;
		width: 100%;
	}

	.toggle-button {
		flex: 1;
		padding: 1rem;
		border: 2px solid #ddd;
		border-radius: 8px;
		background: white;
		color: #333;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		touch-action: manipulation;
		min-height: 56px;
	}

	.toggle-button:active {
		transform: scale(0.98);
	}

	.toggle-button.active {
		background: #007bff;
		color: white;
		border-color: #007bff;
		box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
	}

	.toggle-button:not(.active):hover {
		background: #f8f9fa;
		border-color: #007bff;
	}

	.temperature-button {
		width: 100%;
		padding: 1.5rem;
		border: 2px solid #007bff;
		border-radius: 12px;
		background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
		color: white;
		font-size: 1.5rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.2s;
		touch-action: manipulation;
		min-height: 80px;
		box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
	}

	.temperature-button:active {
		transform: scale(0.98);
		box-shadow: 0 2px 8px rgba(0, 123, 255, 0.4);
	}

	.temperature-value {
		font-size: 2.5rem;
		font-weight: 700;
	}

	.temperature-unit {
		font-size: 1.5rem;
		opacity: 0.9;
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

	.btn-primary {
		background-color: #28a745;
	}

	.btn-primary:hover {
		background-color: #218838;
	}

	.btn-danger {
		background-color: #dc3545;
	}

	.btn-danger:hover {
		background-color: #c82333;
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

	.button-group {
		display: flex;
		gap: 1rem;
	}

	.button-group button {
		flex: 1;
	}


	.actions {
		grid-column: 1 / -1;
	}

	.token-config {
		grid-column: 1 / -1;
		background: #fff3cd;
		border-color: #ffc107;
	}

	.success {
		color: #28a745;
		font-weight: 500;
	}

	.error {
		color: #dc3545;
		font-weight: 500;
	}

	@media (max-width: 768px) {
		.main-content {
			grid-template-columns: 1fr;
		}
	}
</style>

