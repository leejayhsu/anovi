<script lang="ts">
	import type { ApoState } from '$lib/types';

	interface Props {
		deviceState?: ApoState;
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
			{#if deviceState.state?.mode}
				<div class="state-row">
					<span class="state-label">Mode:</span>
					<span class="state-value status-{deviceState.state.mode}">
						{deviceState.state.mode}
					</span>
				</div>
			{/if}

			<!-- Temperature Bulbs - Always show both dry and wet -->
			{#if deviceState.state.mode === 'cook'}
				<!-- Dry Bulb Temperature -->
				{#if deviceState.nodes.temperatureBulbs.mode === 'dry'}
					<div class="state-section-header">
						<strong>Dry Bulb Temperature</strong>
						{#if deviceState.nodes.temperatureBulbs.mode === 'dry'}
							<span class="active-mode-badge">Active</span>
						{/if}
					</div>

					<div class="state-row">
						<span class="state-label">Current:</span>
						<span class="state-value temperature">
							{deviceState.nodes.temperatureBulbs.dry.current.fahrenheit.toFixed(
								1
							)}°F
						</span>
					</div>

					{#if deviceState.nodes.temperatureBulbs.dry.setpoint}
						<div class="state-row">
							<span class="state-label">Setpoint:</span>
							<span class="state-value">
								{deviceState.nodes.temperatureBulbs.dry.setpoint.fahrenheit.toFixed(
									1
								)}°F
							</span>
						</div>
					{/if}
				{/if}

				<!-- Wet Bulb Temperature -->
				{#if deviceState.nodes.temperatureBulbs.mode === 'wet'}
					<div class="state-section-header">
						<strong>Wet Bulb Temperature</strong>
						{#if deviceState.nodes.temperatureBulbs.mode === 'wet'}
							<span class="active-mode-badge">Active</span>
						{/if}
					</div>

					<div class="state-row">
						<span class="state-label">Current:</span>
						<span class="state-value temperature">
							{deviceState.nodes.temperatureBulbs.wet.current.fahrenheit.toFixed(
								1
							)}°F
						</span>
					</div>

					{#if deviceState.nodes.temperatureBulbs.wet.setpoint}
						<div class="state-row">
							<span class="state-label">Setpoint:</span>
							<span class="state-value">
								{deviceState.nodes.temperatureBulbs.wet.setpoint.fahrenheit.toFixed(
									1
								)}°F
							</span>
						</div>
					{/if}
				{/if}
			{/if}

			<!-- Humidity -->
			{#if deviceState.state.mode === 'cook'}
				<div class="state-section-header">
					<strong>Humidity</strong>
					{#if deviceState.nodes.steamGenerators.mode !== 'idle'}
						<span class="active-mode-badge">Active</span>
					{/if}
				</div>

				<div class="state-row">
					<span class="state-label">Current:</span>
					<span class="state-value"
						>{deviceState.nodes.steamGenerators.relativeHumidity.current}%</span
					>
				</div>

				{#if deviceState.nodes.steamGenerators.relativeHumidity.setpoint !== undefined}
					<div class="state-row">
						<span class="state-label">Setpoint:</span>
						<span class="state-value"
							>{deviceState.nodes.steamGenerators.relativeHumidity.setpoint}%</span
						>
					</div>
				{/if}
			{/if}

			<!-- Temperature Probe -->
			{#if deviceState.state.mode === 'cook'}
				<div class="state-section-header">
					<strong>Temperature Probe</strong>
				</div>

				{#if deviceState.nodes.temperatureProbe.current}
					<div class="state-row">
						<span class="state-label">Current:</span>
						<span class="state-value temperature">
							{deviceState.nodes.temperatureProbe.current.celsius.toFixed(1)}°C ({deviceState.nodes.temperatureProbe.current.fahrenheit.toFixed(
								1
							)}°F)
						</span>
					</div>
				{/if}

				{#if deviceState.nodes.temperatureProbe.setpoint}
					<div class="state-row">
						<span class="state-label">Setpoint:</span>
						<span class="state-value">
							{deviceState.nodes.temperatureProbe.setpoint.celsius.toFixed(1)}°C ({deviceState.nodes.temperatureProbe.setpoint.fahrenheit.toFixed(
								1
							)}°F)
						</span>
					</div>
				{/if}
			{/if}

			<!-- Timer -->
			{#if deviceState.nodes?.timer && deviceState.nodes.timer.mode !== 'idle'}
				<div class="state-section-header">
					<strong>Timer</strong>
				</div>
				<div class="state-row">
					<span class="state-label">Current:</span>
					<span class="state-value">
						{formatTimeRemaining(deviceState.nodes.timer.current)}
					</span>
				</div>
				{#if deviceState.nodes.timer.initial !== undefined && deviceState.nodes.timer.initial > 0}
					<div class="state-row">
						<span class="state-label">Initial:</span>
						<span class="state-value">
							{formatTimeRemaining(deviceState.nodes.timer.initial)}
						</span>
					</div>
				{/if}
			{/if}

			<div class="state-row last-update">
				<span class="state-label">Updated:</span>
				<span class="state-value">
					{new Date(deviceState.updatedTimestamp).toLocaleTimeString()}
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
