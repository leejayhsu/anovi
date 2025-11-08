<script lang="ts">
	import Dialpad from './Dialpad.svelte';

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
	<h2>Temperature Probe</h2>
	<div class="form-group">
		<button
			type="button"
			class="toggle-button toggle-button-large"
			class:active={probeEnabled}
			onclick={() => onEnabledChange(!probeEnabled)}
		>
			Enable Probe
		</button>
	</div>
	{#if probeEnabled}
		<div class="form-group">
			<div class="label-text">Temperature Unit</div>
			<div class="toggle-group">
				<button
					type="button"
					class="toggle-button"
					class:active={probeTemperatureUnit === 'C'}
					onclick={() => onUnitChange('C')}
				>
					Celsius
				</button>
				<button
					type="button"
					class="toggle-button"
					class:active={probeTemperatureUnit === 'F'}
					onclick={() => onUnitChange('F')}
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
