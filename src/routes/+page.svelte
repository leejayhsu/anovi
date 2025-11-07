<script lang="ts">
	import {
		createStartCookV1Command,
		createStartCookV2Command,
		createStopCookCommand,
		createSetProbeV1Command,
		createSetProbeV2Command,
		createSetTemperatureUnitCommand,
		celsiusToFahrenheit,
		fahrenheitToCelsius,
		type StartCookV1Stage,
		type StartCookV2Stage
	} from '$lib/anova';

	// Device configuration
	let deviceId = $state('');
	let deviceVersion = $state<'v1' | 'v2'>('v2');
	let websocket: WebSocket | null = $state(null);

	// Temperature settings
	let temperatureMode = $state<'dry' | 'wet'>('dry');
	let temperatureCelsius = $state(180);
	let temperatureUnit = $state<'C' | 'F'>('C');

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

	// Connection status
	let connected = $state(false);
	let lastCommand = $state<string | null>(null);

	// Initialize WebSocket connection
	async function connectWebSocket() {
		// TODO: Implement WebSocket connection with Personal Access Token
		// This is a placeholder - you'll need to implement the actual connection
		console.log('WebSocket connection not yet implemented');
		connected = false;
	}

	// Send command helper
	async function sendCommand(command: any) {
		if (!websocket || websocket.readyState !== WebSocket.OPEN) {
			alert('WebSocket not connected. Please implement the connection logic.');
			return;
		}
		websocket.send(JSON.stringify(command));
		lastCommand = JSON.stringify(command, null, 2);
	}

	// Start cooking
	async function startCook() {
		if (!deviceId) {
			alert('Please enter a device ID');
			return;
		}

		if (deviceVersion === 'v1') {
			const stage: StartCookV1Stage = {
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
			};

			const command = createStartCookV1Command({
				deviceId,
				stages: [stage]
			});
			await sendCommand(command);
		} else {
			const stage: StartCookV2Stage = {
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
			};

			const command = createStartCookV2Command({
				deviceId,
				stages: [stage]
			});
			await sendCommand(command);
		}
	}

	// Stop cooking
	async function stopCook() {
		if (!deviceId) {
			alert('Please enter a device ID');
			return;
		}
		const command = createStopCookCommand(deviceId);
		await sendCommand(command);
	}

	// Set probe
	async function setProbe() {
		if (!deviceId) {
			alert('Please enter a device ID');
			return;
		}
		if (deviceVersion === 'v1') {
			const command = createSetProbeV1Command(
				deviceId,
				probeSetpointCelsius,
				celsiusToFahrenheit(probeSetpointCelsius)
			);
			await sendCommand(command);
		} else {
			const command = createSetProbeV2Command(deviceId, probeSetpointCelsius);
			await sendCommand(command);
		}
	}

	// Set temperature unit
	async function setTemperatureUnit() {
		if (!deviceId) {
			alert('Please enter a device ID');
			return;
		}
		const command = createSetTemperatureUnitCommand(deviceId, temperatureUnit);
		await sendCommand(command);
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
</script>

<svelte:head>
	<title>Anova Oven Remote Control</title>
</svelte:head>

<div class="container">
	<header>
		<h1>Anova Precision Oven Remote Control</h1>
		<div class="connection-status">
			<span class="status-indicator" class:connected={connected}></span>
			<span>{connected ? 'Connected' : 'Disconnected'}</span>
		</div>
	</header>

	<div class="main-content">
		<!-- Device Configuration -->
		<section class="card">
			<h2>Device Configuration</h2>
			<div class="form-group">
				<label for="device-id">Device ID</label>
				<input
					id="device-id"
					type="text"
					bind:value={deviceId}
					placeholder="Enter device ID"
				/>
			</div>
			<div class="form-group">
				<label for="device-version">Device Version</label>
				<select id="device-version" bind:value={deviceVersion}>
					<option value="v1">Oven v1</option>
					<option value="v2">Oven v2</option>
				</select>
			</div>
			<button type="button" onclick={connectWebSocket}>Connect</button>
		</section>

		<!-- Temperature Control -->
		<section class="card">
			<h2>Temperature Control</h2>
			<div class="form-group">
				<label for="temp-mode">Mode</label>
				<select id="temp-mode" bind:value={temperatureMode}>
					<option value="dry">Dry</option>
					<option value="wet">Wet</option>
				</select>
			</div>
			<div class="form-group">
				<label for="temp-unit">Temperature Unit</label>
				<select id="temp-unit" bind:value={temperatureUnit}>
					<option value="C">Celsius</option>
					<option value="F">Fahrenheit</option>
				</select>
			</div>
			<div class="form-group">
				<label for="temperature">
					Temperature ({temperatureUnit === 'C' ? '°C' : '°F'})
				</label>
				<input
					id="temperature"
					type="number"
					bind:value={temperatureCelsius}
					min={temperatureMode === 'wet' ? 25 : 25}
					max={temperatureMode === 'wet' ? 100 : 250}
					step="1"
				/>
				<span class="helper-text">
					{temperatureMode === 'wet'
						? 'Range: 25-100°C (75-212°F)'
						: 'Range: 25-250°C (75-482°F)'}
				</span>
			</div>
			<div class="form-group">
				<button type="button" onclick={setTemperatureUnit}>Set Temperature Unit</button>
			</div>
		</section>

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
				<div class="form-group">
					<button type="button" onclick={setProbe}>Set Probe</button>
				</div>
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
				<button type="button" class="btn-primary" onclick={startCook}>
					Start Cook
				</button>
				<button type="button" class="btn-danger" onclick={stopCook}>
					Stop Cook
				</button>
			</div>
		</section>

		<!-- Last Command -->
		{#if lastCommand}
			<section class="card">
				<h2>Last Command Sent</h2>
				<pre class="command-output">{lastCommand}</pre>
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

	.button-group {
		display: flex;
		gap: 1rem;
	}

	.button-group button {
		flex: 1;
	}

	.command-output {
		background: #f5f5f5;
		border: 1px solid #ddd;
		border-radius: 4px;
		padding: 1rem;
		overflow-x: auto;
		font-size: 0.875rem;
		font-family: 'Courier New', monospace;
	}

	.actions {
		grid-column: 1 / -1;
	}

	@media (max-width: 768px) {
		.main-content {
			grid-template-columns: 1fr;
		}
	}
</style>
