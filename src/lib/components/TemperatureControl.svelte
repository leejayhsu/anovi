<script lang="ts">
	import Dialpad from './Dialpad.svelte';

	interface Props {
		temperatureMode: 'dry' | 'wet';
		temperatureUnit: 'C' | 'F';
		displayTemperature: number;
		onModeChange: (mode: 'dry' | 'wet') => void;
		onTemperatureChange: (value: number) => void;
		dialpadMin: number;
		dialpadMax: number;
	}

	let {
		temperatureMode,
		temperatureUnit,
		displayTemperature,
		onModeChange,
		onTemperatureChange,
		dialpadMin,
		dialpadMax
	}: Props = $props();

	let showTemperatureDialpad = $state(false);
</script>

<div class="temperature-control">
	<div class="header">
		<h3>Temp</h3>
		<div class="toggle-group">
			<button
				type="button"
				class="toggle-button"
				class:active={temperatureMode === 'dry'}
				onclick={() => onModeChange('dry')}
			>
				Normal
			</button>
			<button
				type="button"
				class="toggle-button"
				class:active={temperatureMode === 'wet'}
				onclick={() => onModeChange('wet')}
			>
				Sous-Vide
			</button>
		</div>
	</div>
	<div class="form-group">
		<button
			type="button"
			class="temperature-button orange-gradient"
			onclick={() => (showTemperatureDialpad = true)}
		>
			<div class="temperature-display">
				<span class="temperature-value">{displayTemperature}</span>
				<span class="temperature-unit">{temperatureUnit === 'C' ? '°C' : '°F'}</span>
			</div>
			<span class="range-text">
				{temperatureMode === 'wet'
					? temperatureUnit === 'C'
						? 'Range: 25-100°C'
						: 'Range: 75-212°F'
					: temperatureUnit === 'C'
						? 'Range: 25-250°C'
						: 'Range: 75-482°F'}
			</span>
		</button>
	</div>
</div>

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

<style>
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.header h3 {
		margin: 0;
	}

	.header .toggle-group {
		gap: 0.25rem;
		width: auto;
	}

	.header .toggle-button {
		padding: 0.25rem 0.5rem;
		font-size: 1.1rem;
		min-height: auto;
		flex: none;
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

	.temperature-button .range-text {
		font-size: 0.8rem !important;
		opacity: 0.9;
	}
</style>
