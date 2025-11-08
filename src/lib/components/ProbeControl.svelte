<script lang="ts">
	import Dialpad from './Dialpad.svelte';
	import { Thermometer } from 'lucide-svelte';

	interface Props {
		probeEnabled: boolean;
		temperatureUnit: 'C' | 'F';
		displayProbeTemperature: number;
		onEnabledChange: (enabled: boolean) => void;
		onTemperatureChange: (value: number) => void;
		dialpadMin: number;
		dialpadMax: number;
	}

	let {
		probeEnabled,
		temperatureUnit,
		displayProbeTemperature,
		onEnabledChange,
		onTemperatureChange,
		dialpadMin,
		dialpadMax
	}: Props = $props();

	let showProbeDialpad = $state(false);
</script>

<section class="card">
	<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
		<h2 style="margin: 0;">Temperature Probe</h2>
		<button
			type="button"
			class="icon-button"
			class:active={probeEnabled}
			onclick={() => onEnabledChange(!probeEnabled)}
			title={probeEnabled ? 'Disable Probe' : 'Enable Probe'}
		>
			<Thermometer size={24} />
		</button>
	</div>
	<div class="form-group">
		<label for="probe-setpoint-button">Probe Setpoint</label>
		<button
			id="probe-setpoint-button"
			type="button"
			class="temperature-button orange-gradient"
			onclick={() => (showProbeDialpad = true)}
			disabled={!probeEnabled}
		>
			<div class="temperature-display">
				<span class="temperature-value">{displayProbeTemperature}</span>
				<span class="temperature-unit">{temperatureUnit === 'C' ? '°C' : '°F'}</span>
			</div>
			<span class="range-text">
				{temperatureUnit === 'C' ? 'Range: 1-100°C' : 'Range: 33-212°F'}
			</span>
		</button>
	</div>
</section>

<style>
	.icon-button {
		background: none;
		border: 2px solid var(--border-color, #ccc);
		border-radius: 8px;
		padding: 8px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		color: var(--text-secondary, #666);
	}

	.icon-button:hover {
		background: var(--hover-bg, #f0f0f0);
	}

	.icon-button.active {
		background: var(--primary-color, #007bff);
		border-color: var(--primary-color, #007bff);
		color: white;
	}

	.icon-button:active {
		transform: scale(0.95);
	}

	.orange-gradient {
		background: linear-gradient(135deg, #ee7f35 0%, #dc3e12 100%) !important;
		border: none !important;
		box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3) !important;
	}

	.orange-gradient:active {
		box-shadow: 0 2px 8px rgba(255, 107, 53, 0.4) !important;
	}

	.temperature-button {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.temperature-display {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
	}

	.range-text {
		font-size: .1rem;
		opacity: 0.9;
	}

	.temperature-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.temperature-button:disabled .temperature-value,
	.temperature-button:disabled .temperature-unit {
		color: var(--text-secondary, #999);
	}
</style>

{#if showProbeDialpad}
	<Dialpad
		value={displayProbeTemperature}
		min={dialpadMin}
		max={dialpadMax}
		unit={temperatureUnit === 'C' ? '°C' : '°F'}
		onChange={onTemperatureChange}
		onClose={() => (showProbeDialpad = false)}
	/>
{/if}
