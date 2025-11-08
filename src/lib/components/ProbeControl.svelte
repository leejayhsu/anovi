<script lang="ts">
	import Dialpad from './Dialpad.svelte';
	import { Thermometer } from 'lucide-svelte';

	interface Props {
		probeEnabled: boolean;
		probeTemperatureUnit: 'C' | 'F';
		displayProbeTemperature: number;
		onEnabledChange: (enabled: boolean) => void;
		onUnitChange: (unit: 'C' | 'F') => void;
		onTemperatureChange: (value: number) => void;
		dialpadMin: number;
		dialpadMax: number;
	}

	let {
		probeEnabled,
		probeTemperatureUnit,
		displayProbeTemperature,
		onEnabledChange,
		onUnitChange,
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
		<div class="label-text">Temperature Unit</div>
		<div class="toggle-group">
			<button
				type="button"
				class="toggle-button"
				class:active={probeTemperatureUnit === 'C'}
				onclick={() => onUnitChange('C')}
				disabled={!probeEnabled}
			>
				Celsius
			</button>
			<button
				type="button"
				class="toggle-button"
				class:active={probeTemperatureUnit === 'F'}
				onclick={() => onUnitChange('F')}
				disabled={!probeEnabled}
			>
				Fahrenheit
			</button>
		</div>
	</div>
	<div class="form-group">
		<label for="probe-setpoint-button">Probe Setpoint</label>
		<button
			id="probe-setpoint-button"
			type="button"
			class="temperature-button"
			onclick={() => (showProbeDialpad = true)}
			disabled={!probeEnabled}
		>
			<span class="temperature-value">{displayProbeTemperature}</span>
			<span class="temperature-unit">{probeTemperatureUnit === 'C' ? '°C' : '°F'}</span>
		</button>
		<span class="helper-text">
			{probeTemperatureUnit === 'C' ? 'Range: 1-100°C' : 'Range: 33-212°F'}
		</span>
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
</style>

{#if showProbeDialpad}
	<Dialpad
		value={displayProbeTemperature}
		min={dialpadMin}
		max={dialpadMax}
		unit={probeTemperatureUnit === 'C' ? '°C' : '°F'}
		onChange={onTemperatureChange}
		onClose={() => (showProbeDialpad = false)}
	/>
{/if}
