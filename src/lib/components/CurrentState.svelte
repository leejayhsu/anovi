<script lang="ts">
	import type { DeviceState } from '$lib/anova';

	interface Props {
		deviceState: DeviceState | null;
		deviceId: string;
		wsConnected: boolean;
	}

	let { deviceState, deviceId, wsConnected }: Props = $props();

	// Format time remaining for display
	function formatTimeRemaining(seconds: number | undefined): string {
		if (seconds === undefined) return '--:--:--';
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}
</script>

{#if deviceState}
	<section class="card">
		<h2>Current State</h2>
		<div class="state-info">
			<!-- Mode -->
			{#if deviceState.mode}
				<div class="state-row">
					<span class="state-label">Mode:</span>
					<span class="state-value status-{deviceState.mode}">
						{deviceState.mode}
					</span>
				</div>
			{/if}

			<!-- Temperature Bulbs - Always show both dry and wet -->
			{#if deviceState.temperatureBulbs}
				<!-- Dry Bulb Temperature -->
				{#if deviceState.temperatureBulbs.dry?.current}
					<div class="state-section-header">
						<strong>Dry Bulb Temperature</strong>
						{#if deviceState.temperatureBulbs.mode === 'dry'}
							<span class="active-mode-badge">Active</span>
						{/if}
					</div>

					<div class="state-row">
						<span class="state-label">Current:</span>
						<span class="state-value temperature">
							{deviceState.temperatureBulbs.dry.current.celsius.toFixed(1)}°C
							({deviceState.temperatureBulbs.dry.current.fahrenheit.toFixed(1)}°F)
						</span>
					</div>

					{#if deviceState.temperatureBulbs.dry.setpoint}
						<div class="state-row">
							<span class="state-label">Setpoint:</span>
							<span class="state-value">
								{deviceState.temperatureBulbs.dry.setpoint.celsius.toFixed(1)}°C
								({deviceState.temperatureBulbs.dry.setpoint.fahrenheit.toFixed(1)}°F)
							</span>
						</div>
					{/if}
				{/if}

				<!-- Wet Bulb Temperature -->
				{#if deviceState.temperatureBulbs.wet?.current}
					<div class="state-section-header">
						<strong>Wet Bulb Temperature</strong>
						{#if deviceState.temperatureBulbs.mode === 'wet'}
							<span class="active-mode-badge">Active</span>
						{/if}
					</div>

					<div class="state-row">
						<span class="state-label">Current:</span>
						<span class="state-value temperature">
							{deviceState.temperatureBulbs.wet.current.celsius.toFixed(1)}°C
							({deviceState.temperatureBulbs.wet.current.fahrenheit.toFixed(1)}°F)
						</span>
					</div>

					{#if deviceState.temperatureBulbs.wet.setpoint}
						<div class="state-row">
							<span class="state-label">Setpoint:</span>
							<span class="state-value">
								{deviceState.temperatureBulbs.wet.setpoint.celsius.toFixed(1)}°C
								({deviceState.temperatureBulbs.wet.setpoint.fahrenheit.toFixed(1)}°F)
							</span>
						</div>
					{/if}
				{/if}
			{/if}

			<!-- Humidity -->
			{#if deviceState.steamGenerators?.relativeHumidity?.current !== undefined}
				<div class="state-section-header">
					<strong>Humidity</strong>
					{#if deviceState.steamGenerators.mode !== 'idle'}
						<span class="active-mode-badge">Active</span>
					{/if}
				</div>

				<div class="state-row">
					<span class="state-label">Current:</span>
					<span class="state-value">{deviceState.steamGenerators.relativeHumidity.current}%</span>
				</div>

				{#if deviceState.steamGenerators.relativeHumidity.setpoint !== undefined}
					<div class="state-row">
						<span class="state-label">Setpoint:</span>
						<span class="state-value">{deviceState.steamGenerators.relativeHumidity.setpoint}%</span>
					</div>
				{/if}
			{/if}

			<!-- Temperature Probe -->
			{#if deviceState.temperatureProbe?.connected}
				<div class="state-section-header">
					<strong>Temperature Probe</strong>
				</div>

				{#if deviceState.temperatureProbe.current}
					<div class="state-row">
						<span class="state-label">Current:</span>
						<span class="state-value temperature">
							{deviceState.temperatureProbe.current.celsius.toFixed(1)}°C
							({deviceState.temperatureProbe.current.fahrenheit.toFixed(1)}°F)
						</span>
					</div>
				{/if}

				{#if deviceState.temperatureProbe.setpoint}
					<div class="state-row">
						<span class="state-label">Setpoint:</span>
						<span class="state-value">
							{deviceState.temperatureProbe.setpoint.celsius.toFixed(1)}°C
							({deviceState.temperatureProbe.setpoint.fahrenheit.toFixed(1)}°F)
						</span>
					</div>
				{/if}
			{/if}

			<!-- Timer -->
			{#if deviceState.timer && deviceState.timer.mode !== 'idle'}
				<div class="state-section-header">
					<strong>Timer</strong>
				</div>
				<div class="state-row">
					<span class="state-label">Current:</span>
					<span class="state-value">
						{formatTimeRemaining(deviceState.timer.current)}
					</span>
				</div>
				{#if deviceState.timer.initial !== undefined && deviceState.timer.initial > 0}
					<div class="state-row">
						<span class="state-label">Initial:</span>
						<span class="state-value">
							{formatTimeRemaining(deviceState.timer.initial)}
						</span>
					</div>
				{/if}
			{/if}

			<!-- Cook Information -->
			{#if deviceState.cook}
				<div class="state-section-header">
					<strong>Cook Progress</strong>
				</div>
				{#if deviceState.cook.activeStageIndex !== undefined}
					<div class="state-row">
						<span class="state-label">Stage:</span>
						<span class="state-value">{deviceState.cook.activeStageIndex + 1}</span>
					</div>
				{/if}
				{#if deviceState.cook.activeStageSecondsElapsed !== undefined}
					<div class="state-row">
						<span class="state-label">Stage Time:</span>
						<span class="state-value">
							{formatTimeRemaining(deviceState.cook.activeStageSecondsElapsed)}
						</span>
					</div>
				{/if}
				{#if deviceState.cook.secondsElapsed !== undefined}
					<div class="state-row">
						<span class="state-label">Total Time:</span>
						<span class="state-value">
							{formatTimeRemaining(deviceState.cook.secondsElapsed)}
						</span>
					</div>
				{/if}
			{/if}

			<div class="state-row last-update">
				<span class="state-label">Updated:</span>
				<span class="state-value">
					{new Date(deviceState.lastUpdated).toLocaleTimeString()}
				</span>
			</div>
		</div>
	</section>
{:else if deviceId && wsConnected}
	<section class="card">
		<h2>Current State</h2>
		<p class="loading-state">Waiting for device state updates...</p>
	</section>
{:else if deviceId}
	<section class="card">
		<h2>Current State</h2>
		<p class="loading-state">Connecting to device...</p>
	</section>
{/if}

