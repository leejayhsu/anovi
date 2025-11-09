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

	/* this one looks more like pulsing*/
	/* .orange-gradient {
		background: linear-gradient(135deg, #ee7f35, #f75b1e, #dc3e12);
		background-size: 400% 400%;
		animation: gradient-shift 3s ease infinite;
		border: none !important;
	}

	@keyframes gradient-shift {
		0% {
			background-position: 0% 50%;
		}
		25% {
			background-position: 50% 100%;
		}
		50% {
			background-position: 100% 50%;
		}
		75% {
			background-position: 50% 0%;
		}
		100% {
			background-position: 0% 50%;
		}
	} */

	.orange-gradient {
		background: linear-gradient(135deg, #ee7f35, #dc3e12, #f7931e);
		background-size: 400% 400%;
		animation: gradient-shift 8s ease infinite;
		border: none !important;
	}

	@keyframes gradient-shift {
		0% {
			background-position: 0% 50%;
		}
		25% {
			background-position: 50% 100%;
		}
		50% {
			background-position: 100% 50%;
		}
		75% {
			background-position: 50% 0%;
		}
		100% {
			background-position: 0% 50%;
		}
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
