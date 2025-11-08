<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		celsiusToFahrenheit,
		fahrenheitToCelsius,
		generateUUID,
		type StartCookV1Stage,
		type StartCookV2Stage
	} from '$lib/anova.js';
	import TemperatureControl from '$lib/components/TemperatureControl.svelte';
	import HeatingElements from '$lib/components/HeatingElements.svelte';
	import SteamControl from '$lib/components/SteamControl.svelte';
	import TimerControl from '$lib/components/TimerControl.svelte';
	import ProbeControl from '$lib/components/ProbeControl.svelte';
	import CurrentState from '$lib/components/CurrentState.svelte';
	import ActionsPanel from '$lib/components/ActionsPanel.svelte';
	import { deviceConfig } from '$lib/stores/device.js';
	import { wsStore } from '$lib/stores/websocket.svelte.js';

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

	// Combine server-loaded devices with WebSocket-discovered devices
	let allDevices = $derived(() => {
		const devices = new Map<string, any>();
		// Add server-loaded devices
		if (data.discoveredDevices) {
			for (const device of data.discoveredDevices) {
				devices.set(device.cookerId, device);
			}
		}
		// Add/update with WebSocket-discovered devices
		for (const [id, device] of $wsStore.devices) {
			devices.set(id, device);
		}
		return Array.from(devices.values());
	});

	// Auto-select device version based on discovered devices
	$effect(() => {
		const devices = allDevices();
		if (devices && devices.length > 0 && !deviceId) {
			const firstDevice = devices[0];
			deviceId = firstDevice.cookerId;
			deviceVersion = firstDevice.type === 'oven_v1' ? 'v1' : 'v2';
			deviceConfig.set({ deviceId, deviceVersion });
		}
	});

	// Update device version when device ID changes
	$effect(() => {
		const devices = allDevices();
		if (deviceId && devices) {
			const selectedDevice = devices.find((d: any) => d.cookerId === deviceId);
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

	// Handle result change from child components
	function handleResultChange(result: { success: boolean; error?: string } | null) {
		lastResult = result;
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

	// Connect to WebSocket on mount
	onMount(() => {
		wsStore.connect();
	});

	// Disconnect WebSocket on unmount
	onDestroy(() => {
		wsStore.disconnect();
	});

	// Request device state when deviceId changes
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

	// Get current device state from WebSocket store
	let currentDeviceState = $derived(
		deviceId ? ($wsStore.deviceStates.get(deviceId) ?? null) : null
	);
</script>

<svelte:head>
	<title>Anova Oven Remote Control</title>
</svelte:head>

<div class="container">
	<div class="layout-wrapper">
		<div class="main-content">
		<TemperatureControl
			temperatureMode={temperatureMode}
			temperatureUnit={temperatureUnit}
			displayTemperature={displayTemperature}
			onModeChange={(mode) => temperatureMode = mode}
			onUnitChange={handleUnitChange}
			onTemperatureChange={handleTemperatureChange}
			dialpadMin={dialpadMin}
			dialpadMax={dialpadMax}
		/>

		<HeatingElements
			topElement={topElement}
			bottomElement={bottomElement}
			rearElement={rearElement}
			hasActiveHeatingElement={hasActiveHeatingElement}
			onToggle={toggleHeatingElement}
		/>

		<SteamControl
			steamMode={steamMode}
			steamSetpoint={steamSetpoint}
			onModeChange={(mode) => steamMode = mode}
			onSetpointChange={(value) => steamSetpoint = value}
		/>

		<TimerControl
			timerEnabled={timerEnabled}
			timerSeconds={timerSeconds}
			timerStartType={timerStartType}
			onEnabledChange={(enabled) => timerEnabled = enabled}
			onSecondsChange={(seconds) => timerSeconds = seconds}
			onStartTypeChange={(startType) => timerStartType = startType}
		/>

		<ProbeControl
			probeEnabled={probeEnabled}
			probeTemperatureUnit={probeTemperatureUnit}
			displayProbeTemperature={displayProbeTemperature}
			onEnabledChange={(enabled) => probeEnabled = enabled}
			onUnitChange={(unit) => probeTemperatureUnit = unit}
			onTemperatureChange={handleProbeTemperatureChange}
			dialpadMin={probeDialpadMin}
			dialpadMax={probeDialpadMax}
		/>

		</div>
		
		<!-- Actions Sidebar -->
		<aside class="actions-sidebar">
			<ActionsPanel
				deviceId={deviceId}
				deviceVersion={deviceVersion}
				hasActiveHeatingElement={hasActiveHeatingElement}
				buildStageData={buildStageData}
				lastResult={lastResult}
				wsConnected={$wsStore.connected}
				wsError={$wsStore.error}
				onResultChange={handleResultChange}
			/>

			<CurrentState
				deviceState={currentDeviceState}
				deviceId={deviceId}
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
		font-family: system-ui, -apple-system, sans-serif;
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

