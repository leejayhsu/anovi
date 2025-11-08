<script lang="ts">
	import TimeSelector from './TimeSelector.svelte';

	interface Props {
		timerEnabled: boolean;
		timerSeconds: number;
		timerStartType: 'immediately' | 'when-preheated' | 'manual';
		onEnabledChange: (enabled: boolean) => void;
		onSecondsChange: (seconds: number) => void;
		onStartTypeChange: (startType: 'immediately' | 'when-preheated' | 'manual') => void;
	}

	let {
		timerEnabled,
		timerSeconds,
		timerStartType,
		onEnabledChange,
		onSecondsChange,
		onStartTypeChange
	}: Props = $props();

	let showTimerSelector = $state(false);

	// Format time - always show hours:minutes:seconds format
	function formatTime(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}
</script>

<section class="card">
	<h2>Timer</h2>
	<div class="form-group">
		<button
			type="button"
			class="toggle-button toggle-button-large"
			class:active={timerEnabled}
			onclick={() => onEnabledChange(!timerEnabled)}
		>
			Enable Timer
		</button>
	</div>
	{#if timerEnabled}
		<div class="form-group">
			<label>Duration</label>
			<button
				type="button"
				class="temperature-button"
				onclick={() => (showTimerSelector = true)}
			>
				<span class="temperature-value">{formatTime(timerSeconds)}</span>
			</button>
		</div>
		<div class="form-group">
			<label>Start Type</label>
			<div class="toggle-group toggle-group-vertical">
				<button
					type="button"
					class="toggle-button"
					class:active={timerStartType === 'immediately'}
					onclick={() => onStartTypeChange('immediately')}
				>
					Immediately
				</button>
				<button
					type="button"
					class="toggle-button"
					class:active={timerStartType === 'when-preheated'}
					onclick={() => onStartTypeChange('when-preheated')}
				>
					When Preheated
				</button>
				<button
					type="button"
					class="toggle-button"
					class:active={timerStartType === 'manual'}
					onclick={() => onStartTypeChange('manual')}
				>
					Manual
				</button>
			</div>
		</div>
	{/if}
</section>

{#if showTimerSelector}
	<TimeSelector
		value={timerSeconds}
		onChange={onSecondsChange}
		onClose={() => (showTimerSelector = false)}
	/>
{/if}

