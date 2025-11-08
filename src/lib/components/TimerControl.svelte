<script lang="ts">
	import TimeSelector from './TimeSelector.svelte';
	import { Timer } from 'lucide-svelte';

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
	<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
		<h2 style="margin: 0;">Timer</h2>
		<button
			type="button"
			class="icon-button"
			class:active={timerEnabled}
			onclick={() => onEnabledChange(!timerEnabled)}
			title={timerEnabled ? 'Disable Timer' : 'Enable Timer'}
		>
			<Timer size={24} />
		</button>
	</div>
	<div class="form-group">
		<label>Duration</label>
		<button 
			type="button" 
			class="temperature-button" 
			onclick={() => (showTimerSelector = true)}
			disabled={!timerEnabled}
		>
			<span class="temperature-value">{formatTime(timerSeconds)}</span>
		</button>
	</div>
	<div class="form-group">
		<label>Start Type</label>
		<div class="toggle-group">
			<button
				type="button"
				class="toggle-button"
				class:active={timerStartType === 'immediately'}
				onclick={() => onStartTypeChange('immediately')}
				disabled={!timerEnabled}
			>
				Immediately
			</button>
			<button
				type="button"
				class="toggle-button"
				class:active={timerStartType === 'when-preheated'}
				onclick={() => onStartTypeChange('when-preheated')}
				disabled={!timerEnabled}
			>
				When Preheated
			</button>
			<!-- TODO: Let's not present manual start type for now, it is confusing for users -->
		</div>
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

	.temperature-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.temperature-button:disabled .temperature-value {
		color: var(--text-secondary, #999);
	}

	.toggle-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>

{#if showTimerSelector}
	<TimeSelector
		value={timerSeconds}
		onChange={onSecondsChange}
		onClose={() => (showTimerSelector = false)}
	/>
{/if}
