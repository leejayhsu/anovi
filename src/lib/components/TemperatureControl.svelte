<script lang="ts">
	import Dialpad from './Dialpad.svelte';

	interface Props {
		temperatureMode: 'dry' | 'wet';
		temperatureUnit: 'C' | 'F';
		displayTemperature: number;
		onModeChange: (mode: 'dry' | 'wet') => void;
		onUnitChange: (unit: 'C' | 'F') => void;
		onTemperatureChange: (value: number) => void;
		dialpadMin: number;
		dialpadMax: number;
	}

	let {
		temperatureMode,
		temperatureUnit,
		displayTemperature,
		onModeChange,
		onUnitChange,
		onTemperatureChange,
		dialpadMin,
		dialpadMax
	}: Props = $props();

	let showTemperatureDialpad = $state(false);
</script>

<section class="card">
	<h2>Temperature Control</h2>
	<div class="form-group">
		<label>Mode</label>
		<div class="toggle-group">
			<button
				type="button"
				class="toggle-button"
				class:active={temperatureMode === 'dry'}
				onclick={() => onModeChange('dry')}
			>
				Dry
			</button>
			<button
				type="button"
				class="toggle-button"
				class:active={temperatureMode === 'wet'}
				onclick={() => onModeChange('wet')}
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
				onclick={() => onUnitChange('C')}
			>
				Celsius
			</button>
			<button
				type="button"
				class="toggle-button"
				class:active={temperatureUnit === 'F'}
				onclick={() => onUnitChange('F')}
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
				? temperatureUnit === 'C'
					? 'Range: 25-100°C'
					: 'Range: 75-212°F'
				: temperatureUnit === 'C'
					? 'Range: 25-250°C'
					: 'Range: 75-482°F'}
		</span>
	</div>
</section>

{#if showTemperatureDialpad}
	<Dialpad
		value={displayTemperature}
		min={dialpadMin}
		max={dialpadMax}
		unit={temperatureUnit === 'C' ? '°C' : '°F'}
		onChange={onTemperatureChange}
		onClose={() => (showTemperatureDialpad = false)}
	/>
{/if}
