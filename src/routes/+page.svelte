<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		celsiusToFahrenheit,
		fahrenheitToCelsius,
		generateUUID,
		createSetProbeV1Command
	} from '$lib/anova.js';
	import TemperatureControl from '$lib/components/TemperatureControl.svelte';
	import HeatingElements from '$lib/components/HeatingElements.svelte';
	import SteamControl from '$lib/components/SteamControl.svelte';
	import TimerControl from '$lib/components/TimerControl.svelte';
	import ProbeControl from '$lib/components/ProbeControl.svelte';
	import CurrentState from '$lib/components/CurrentState.svelte';
	import ActionsPanel from '$lib/components/ActionsPanel.svelte';
	import { wsStore } from '$lib/stores/websocket.svelte.js';
	import type { StartCookV1Stage } from '$lib/types.js';

	// Page data (includes temperature unit preference)
	let { data } = $props();

	// Use device from WebSocket store
	let deviceId = $derived($wsStore.deviceId);

	// Temperature settings
	let temperatureMode = $state<'dry' | 'wet'>('dry');
	let temperatureCelsius = $state(177);
	let temperatureUnit = $state<'C' | 'F'>(data.temperatureUnit);

	// Update temperature unit when data changes
	$effect(() => {
		temperatureUnit = data.temperatureUnit;
	});

	// Heating elements
	let topElement = $state(true);
	let bottomElement = $state(false);
	let rearElement = $state(false);

	// Fan and vent
	let fanSpeed = $state(100);
	let ventOpen = $state(false);

	// Steam settings
	let steamSetpoint = $state(0); // 0 = idle, >0 = relative-humidity

	// Timer settings
	let timerEnabled = $state(false);
	let timerSeconds = $state(1800); // 30 minutes default
	let timerStartType = $state<'immediately' | 'when-preheated' | 'manual'>('immediately');

	// Probe settings
	let probeEnabled = $state(false);
	let probeSetpointCelsius = $state(65);

	// Rack position
	let rackPosition = $state(3);

	// Computed values
	let temperatureFahrenheit = $derived(celsiusToFahrenheit(temperatureCelsius));
	let displayTemperature = $derived(
		temperatureUnit === 'C' ? temperatureCelsius : temperatureFahrenheit
	);
	let hasActiveHeatingElement = $derived(topElement || bottomElement || rearElement);
	let probeSetpointFahrenheit = $derived(celsiusToFahrenheit(probeSetpointCelsius));
	let displayProbeTemperature = $derived(
		temperatureUnit === 'C' ? probeSetpointCelsius : probeSetpointFahrenheit
	);

	// UI state
	let lastResult = $state<{ success: boolean; error?: string } | null>(null);

	// Build stage data for form submission (Oven v1)
	function buildStageData(): StartCookV1Stage {
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
			// Steam control: 0 = idle, >0 = relative-humidity
			steamGenerators:
				steamSetpoint === 0
					? { mode: 'idle' }
					: {
							mode: 'relative-humidity',
							relativeHumidity: { setpoint: steamSetpoint }
						},
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
		};
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
		if (temperatureUnit === 'F') {
			// User entered Fahrenheit, convert to Celsius
			probeSetpointCelsius = fahrenheitToCelsius(value);
		} else {
			// User entered Celsius
			probeSetpointCelsius = value;
		}
	}

	// Automatically set probe when enabled or temperature changes (Oven v1)
	$effect(() => {
		if (probeEnabled && deviceId && probeSetpointCelsius && $wsStore.connected) {
			// Debounce the command to avoid too many requests
			const timeoutId = setTimeout(() => {
				try {
					const command = createSetProbeV1Command(
						deviceId,
						probeSetpointCelsius,
						celsiusToFahrenheit(probeSetpointCelsius)
					);

					// Send command via WebSocket
					const sent = wsStore.sendCommand(command);
					if (sent) {
						lastResult = { success: true };
					} else {
						lastResult = { success: false, error: 'WebSocket not connected' };
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
	let probeDialpadMin = $derived(temperatureUnit === 'C' ? 1 : 33);
	let probeDialpadMax = $derived(temperatureUnit === 'C' ? 100 : 212);

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


	// Handle result change from child components
	function handleResultChange(result: { success: boolean; error?: string } | null) {
		lastResult = result;
	}

	// Get temperature min/max for dialpad
	let dialpadMin = $derived(
		temperatureUnit === 'C'
			? temperatureMode === 'wet'
				? 25
				: 25
			: temperatureMode === 'wet'
				? 75
				: 75
	);
	let dialpadMax = $derived(
		temperatureUnit === 'C'
			? temperatureMode === 'wet'
				? 100
				: 250
			: temperatureMode === 'wet'
				? 212
				: 482
	);

	// Connect to WebSocket on mount
	onMount(() => {
		wsStore.connect();
	});

	// Disconnect WebSocket on unmount
	onDestroy(() => {
		wsStore.disconnect();
	});

	// Request device state when connected
	$effect(() => {
		if (deviceId && $wsStore.connected) {
			// Request state after a short delay to ensure connection is stable
			const timeoutId = setTimeout(() => {
				wsStore.requestDeviceState(deviceId);
			}, 500);

			return () => clearTimeout(timeoutId);
		}
	});

	// Periodically request device state to ensure we have fresh data
	$effect(() => {
		if (!deviceId || !$wsStore.connected) return;

		const intervalId = setInterval(() => {
			wsStore.requestDeviceState(deviceId);
		}, 5000); // Request every 5 seconds

		return () => clearInterval(intervalId);
	});
</script>

<svelte:head>
	<title>Anova Oven Remote Control</title>
</svelte:head>

<div class="container">
	<div class="layout-wrapper">
		<div class="main-content">
			<section class="card">
				<h2>Temperature</h2>
				<TemperatureControl
					{temperatureMode}
					{temperatureUnit}
					{displayTemperature}
					onModeChange={(mode) => (temperatureMode = mode)}
					onTemperatureChange={handleTemperatureChange}
					{dialpadMin}
					{dialpadMax}
				/>

				<div class="divider"></div>

				<ProbeControl
					{probeEnabled}
					{temperatureUnit}
					{displayProbeTemperature}
					onEnabledChange={(enabled) => (probeEnabled = enabled)}
					onTemperatureChange={handleProbeTemperatureChange}
					dialpadMin={probeDialpadMin}
					dialpadMax={probeDialpadMax}
				/>
			</section>

			<section class="card">
				<h2>Heating & Steam</h2>
				<HeatingElements
					{topElement}
					{bottomElement}
					{rearElement}
					{hasActiveHeatingElement}
					onToggle={toggleHeatingElement}
				/>

				<div class="divider"></div>

				<SteamControl
					{steamSetpoint}
					onSetpointChange={(value) => (steamSetpoint = value)}
				/>
			</section>

			<TimerControl
				{timerEnabled}
				{timerSeconds}
				{timerStartType}
				onEnabledChange={(enabled) => (timerEnabled = enabled)}
				onSecondsChange={(seconds) => (timerSeconds = seconds)}
				onStartTypeChange={(startType) => (timerStartType = startType)}
			/>
		</div>

		<!-- Actions Sidebar -->
		<aside class="actions-sidebar">
			<ActionsPanel
				{deviceId}
				{hasActiveHeatingElement}
				{buildStageData}
				{lastResult}
				wsConnected={$wsStore.connected}
				wsError={$wsStore.error}
				onResultChange={handleResultChange}
			/>

			<CurrentState
				deviceState={$wsStore.deviceState}
				{deviceId}
				wsConnected={$wsStore.connected}
			/>
		</aside>
	</div>
</div>

<style>
	.container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem;
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
	}

	.layout-wrapper {
		display: flex;
		gap: 2rem;
		align-items: flex-start;
	}

	.main-content {
		flex: 1;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.actions-sidebar {
		width: 320px;
		flex-shrink: 0;
		position: sticky;
		top: 2rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.divider {
		height: 1px;
		background: #e5e5e5;
		margin: 1.5rem 0;
	}

	@media (max-width: 1024px) {
		.layout-wrapper {
			flex-direction: column;
		}

		.actions-sidebar {
			width: 100%;
			position: relative;
			top: 0;
		}

		.main-content {
			grid-template-columns: 1fr;
		}
	}
</style>
