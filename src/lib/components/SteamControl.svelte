<script lang="ts">
	interface Props {
		steamMode: 'idle' | 'relative-humidity' | 'steam-percentage';
		steamSetpoint: number;
		onModeChange: (mode: 'idle' | 'relative-humidity' | 'steam-percentage') => void;
		onSetpointChange: (value: number) => void;
	}

	let { steamMode, steamSetpoint, onModeChange, onSetpointChange }: Props = $props();
</script>

<section class="card">
	<h2>Steam Control</h2>
	<div class="form-group">
		<div class="toggle-group">
			<button
				type="button"
				class="toggle-button"
				class:active={steamMode === 'idle'}
				onclick={() => onModeChange('idle')}
			>
				Idle
			</button>
			<button
				type="button"
				class="toggle-button"
				class:active={steamMode === 'relative-humidity'}
				onclick={() => onModeChange('relative-humidity')}
			>
				Relative Humidity
			</button>
			<!-- TODO: Let's not present steam percentage mode for now, it is confusing for users -->
		</div>
	</div>
	{#if steamMode !== 'idle'}
		<div class="form-group">
			<label for="steam-setpoint">
				{steamMode === 'relative-humidity' ? 'Humidity' : 'Steam'} Setpoint (%)
			</label>
			<input
				id="steam-setpoint"
				type="range"
				min="0"
				max="100"
				value={steamSetpoint}
				oninput={(e) => onSetpointChange(Number(e.currentTarget.value))}
			/>
			<span>{steamSetpoint}%</span>
		</div>
	{/if}
</section>
