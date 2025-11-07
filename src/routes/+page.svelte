<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import {
		celsiusToFahrenheit,
		fahrenheitToCelsius,
		generateUUID,
		type StartCookV1Stage,
		type StartCookV2Stage
	} from '$lib/anova.js';
	import Dialpad from '$lib/components/Dialpad.svelte';
	import TimeSelector from '$lib/components/TimeSelector.svelte';
	import { deviceConfig } from '$lib/stores/device.js';

	let { data } = $props();

	// Device configuration from store
	let deviceId = $state('');
	let deviceVersion = $state<'v1' | 'v2'>('v2');

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

	// Temperature settings
	let temperatureMode = $state<'dry' | 'wet'>('dry');
	let temperatureCelsius = $state(180);
	let temperatureUnit = $state<'C' | 'F'>('F');

	// Heating elements
	let topElement = $state(true);
	let bottomElement = $state(false);
	let rearElement = $state(false);

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
	let probeTemperatureUnit = $state<'C' | 'F'>('F');

	// Rack position
	let rackPosition = $state(3);

	// Multi-stage cooking
	let multiStageEnabled = $state(false);
	let stages = $state<Array<{ id: string; title: string }>>([{ id: generateUUID(), title: 'Stage 1' }]);

	// Computed values
	let temperatureFahrenheit = $derived(celsiusToFahrenheit(temperatureCelsius));
	let displayTemperature = $derived(
		temperatureUnit === 'C' ? temperatureCelsius : temperatureFahrenheit
	);
	let hasActiveHeatingElement = $derived(topElement || bottomElement || rearElement);
	let probeSetpointFahrenheit = $derived(celsiusToFahrenheit(probeSetpointCelsius));
	let displayProbeTemperature = $derived(
		probeTemperatureUnit === 'C' ? probeSetpointCelsius : probeSetpointFahrenheit
	);

	// UI state
	let lastResult = $state<{ success: boolean; error?: string } | null>(null);
	let showExtraSettings = $state(false);
	
	// Modal and dialpad state
	let showTemperatureDialpad = $state(false);
	let showTimerSelector = $state(false);
	let showProbeDialpad = $state(false);

	// Build stage data for form submission
	function buildStageData(): StartCookV1Stage | StartCookV2Stage {
		if (deviceVersion === 'v1') {
			return {
				stepType: 'stage',
				id: generateUUID(),
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
				id: generateUUID(),
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

	// Format time - always show hours:minutes:seconds format
	function formatTime(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}

	// Handle heating element toggle - prevent turning off the last active element
	function toggleHeatingElement(element: 'top' | 'bottom' | 'rear') {
		const currentState = {
			top: topElement,
			bottom: bottomElement,
			rear: rearElement
		};
		
		// Calculate what the new state would be
		const newState = { ...currentState };
		newState[element] = !currentState[element];
		
		// Check if at least one would still be active
		const wouldHaveActive = newState.top || newState.bottom || newState.rear;
		
		if (!wouldHaveActive) {
			// Don't allow turning off the last active element
			return;
		}
		
		// Apply the change
		if (element === 'top') topElement = !topElement;
		if (element === 'bottom') bottomElement = !bottomElement;
		if (element === 'rear') rearElement = !rearElement;
	}

	// Handle probe temperature input from dialpad
	function handleProbeTemperatureChange(value: number) {
		// Convert if needed based on current unit
		if (probeTemperatureUnit === 'F') {
			// User entered Fahrenheit, convert to Celsius
			probeSetpointCelsius = fahrenheitToCelsius(value);
		} else {
			// User entered Celsius
			probeSetpointCelsius = value;
		}
	}

	// Automatically set probe when enabled or temperature changes
	$effect(() => {
		if (probeEnabled && deviceId && probeSetpointCelsius) {
			// Debounce the API call to avoid too many requests
			const timeoutId = setTimeout(async () => {
				try {
					const formData = new FormData();
					formData.append('deviceId', deviceId);
					formData.append('setpointCelsius', probeSetpointCelsius.toString());
					formData.append('deviceVersion', deviceVersion);
					
					const response = await fetch('?/setProbe', {
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
					console.error('Error setting probe:', error);
					lastResult = { success: false, error: 'Failed to set probe' };
				}
			}, 500); // 500ms debounce
			
			return () => clearTimeout(timeoutId);
		}
	});

	// Get probe temperature min/max for dialpad
	let probeDialpadMin = $derived(
		probeTemperatureUnit === 'C' ? 1 : 33
	);
	let probeDialpadMax = $derived(
		probeTemperatureUnit === 'C' ? 100 : 212
	);

	// Handle timer duration change from time selector
	function handleTimerChange(value: number) {
		timerSeconds = value;
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
	<div class="main-content">
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

		{#if showTimerSelector}
			<TimeSelector
				value={timerSeconds}
				onChange={handleTimerChange}
				onClose={() => (showTimerSelector = false)}
			/>
		{/if}

		{#if showProbeDialpad}
			<Dialpad
				value={displayProbeTemperature}
				min={probeDialpadMin}
				max={probeDialpadMax}
				unit={probeTemperatureUnit === 'C' ? '°C' : '°F'}
				onChange={handleProbeTemperatureChange}
				onClose={() => (showProbeDialpad = false)}
			/>
		{/if}


		<!-- Heating Elements -->
		<section class="card">
			<h2>Heating Elements</h2>
			<div class="form-group">
				<label>Select Heating Elements</label>
				<div class="toggle-group toggle-group-vertical">
					<button
						type="button"
						class="toggle-button"
						class:active={topElement}
						onclick={() => toggleHeatingElement('top')}
					>
						Top Element
					</button>
					<button
						type="button"
						class="toggle-button"
						class:active={bottomElement}
						onclick={() => toggleHeatingElement('bottom')}
					>
						Bottom Element
					</button>
					<button
						type="button"
						class="toggle-button"
						class:active={rearElement}
						onclick={() => toggleHeatingElement('rear')}
					>
						Rear Element
					</button>
				</div>
				{#if !hasActiveHeatingElement}
					<p class="helper-text error-text">
						⚠️ At least one heating element must be active
					</p>
				{/if}
			</div>
		</section>

		<!-- Steam Control -->
		<section class="card">
			<h2>Steam Control</h2>
			<div class="form-group">
				<label>Steam Mode</label>
				<div class="toggle-group toggle-group-vertical">
					<button
						type="button"
						class="toggle-button"
						class:active={steamMode === 'idle'}
						onclick={() => (steamMode = 'idle')}
					>
						Idle
					</button>
					<button
						type="button"
						class="toggle-button"
						class:active={steamMode === 'relative-humidity'}
						onclick={() => (steamMode = 'relative-humidity')}
					>
						Relative Humidity
					</button>
					<button
						type="button"
						class="toggle-button"
						class:active={steamMode === 'steam-percentage'}
						onclick={() => (steamMode = 'steam-percentage')}
					>
						Steam Percentage
					</button>
				</div>
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
				<button
					type="button"
					class="toggle-button toggle-button-large"
					class:active={timerEnabled}
					onclick={() => (timerEnabled = !timerEnabled)}
				>
					Enable Timer
				</button>
			</div>
			{#if timerEnabled}
				<div class="form-group">
					<label>Duration</label>
					<button
						type="button"
						class="temperature-button"
						onclick={() => (showTimerSelector = true)}
					>
						<span class="temperature-value">{formatTime(timerSeconds)}</span>
					</button>
				</div>
				<div class="form-group">
					<label>Start Type</label>
					<div class="toggle-group toggle-group-vertical">
						<button
							type="button"
							class="toggle-button"
							class:active={timerStartType === 'immediately'}
							onclick={() => (timerStartType = 'immediately')}
						>
							Immediately
						</button>
						<button
							type="button"
							class="toggle-button"
							class:active={timerStartType === 'when-preheated'}
							onclick={() => (timerStartType = 'when-preheated')}
						>
							When Preheated
						</button>
						<button
							type="button"
							class="toggle-button"
							class:active={timerStartType === 'manual'}
							onclick={() => (timerStartType = 'manual')}
						>
							Manual
						</button>
					</div>
				</div>
			{/if}
		</section>

		<!-- Probe -->
		<section class="card">
			<h2>Temperature Probe</h2>
			<div class="form-group">
				<button
					type="button"
					class="toggle-button toggle-button-large"
					class:active={probeEnabled}
					onclick={() => (probeEnabled = !probeEnabled)}
				>
					Enable Probe
				</button>
			</div>
			{#if probeEnabled}
				<div class="form-group">
					<label>Temperature Unit</label>
					<div class="toggle-group">
						<button
							type="button"
							class="toggle-button"
							class:active={probeTemperatureUnit === 'C'}
							onclick={() => (probeTemperatureUnit = 'C')}
						>
							Celsius
						</button>
						<button
							type="button"
							class="toggle-button"
							class:active={probeTemperatureUnit === 'F'}
							onclick={() => (probeTemperatureUnit = 'F')}
						>
							Fahrenheit
						</button>
					</div>
				</div>
				<div class="form-group">
					<label>Probe Setpoint</label>
					<button
						type="button"
						class="temperature-button"
						onclick={() => (showProbeDialpad = true)}
					>
						<span class="temperature-value">{displayProbeTemperature}</span>
						<span class="temperature-unit">{probeTemperatureUnit === 'C' ? '°C' : '°F'}</span>
					</button>
					<span class="helper-text">
						{probeTemperatureUnit === 'C' ? 'Range: 1-100°C' : 'Range: 33-212°F'}
					</span>
				</div>
			{/if}
		</section>

		<!-- Extra Settings (Fan & Vent, Rack Position) -->
		<section class="card extra-settings">
			<button
				type="button"
				class="extra-settings-header"
				onclick={() => (showExtraSettings = !showExtraSettings)}
			>
				<h2>Extra Settings</h2>
				<span class="chevron" class:expanded={showExtraSettings}>▼</span>
			</button>
			{#if showExtraSettings}
				<div class="extra-settings-content">
					<!-- Fan & Vent -->
					<div class="card-inner">
						<h3>Fan & Vent</h3>
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
					</div>

					<!-- Rack Position -->
					<div class="card-inner">
						<h3>Rack Position</h3>
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
					</div>
				</div>
			{/if}
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
					<button type="submit" class="btn-primary" disabled={!hasActiveHeatingElement}>
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

	.toggle-group-vertical {
		flex-direction: column;
	}

	.toggle-group-vertical .toggle-button {
		width: 100%;
		flex: none;
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

	.toggle-button-large {
		width: 100%;
		font-size: 1.125rem;
		min-height: 64px;
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

	.btn-primary:disabled {
		background-color: #28a745;
		opacity: 0.6;
		cursor: not-allowed;
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

	.success {
		color: #28a745;
		font-weight: 500;
	}

	.error {
		color: #dc3545;
		font-weight: 500;
	}

	.error-text {
		color: #dc3545;
		margin-top: 0.5rem;
	}

	.extra-settings {
		grid-column: 1 / -1;
	}

	.extra-settings-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0;
		cursor: pointer;
		user-select: none;
		width: 100%;
		background: none;
		border: none;
		padding: 0;
		text-align: left;
		font-family: inherit;
	}

	.extra-settings-header h2 {
		margin: 0;
		font-size: 1.25rem;
		color: #333;
	}

	.extra-settings-header .chevron {
		font-size: 1rem;
		color: #666;
		transition: transform 0.2s;
		display: inline-block;
	}

	.extra-settings-header .chevron.expanded {
		transform: rotate(180deg);
	}

	.extra-settings-content {
		margin-top: 1.5rem;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.card-inner {
		background: #f8f9fa;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 1.5rem;
	}

	.card-inner h3 {
		margin-top: 0;
		margin-bottom: 1rem;
		font-size: 1.125rem;
		color: #333;
	}

	@media (max-width: 768px) {
		.main-content {
			grid-template-columns: 1fr;
		}

		.extra-settings-content {
			grid-template-columns: 1fr;
		}
	}
</style>

