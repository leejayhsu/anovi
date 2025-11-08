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
		<label>Steam Mode</label>
		<div class="toggle-group toggle-group-vertical">
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
			<button
				type="button"
				class="toggle-button"
				class:active={steamMode === 'steam-percentage'}
				onclick={() => onModeChange('steam-percentage')}
			>
				Steam Percentage
			</button>
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

