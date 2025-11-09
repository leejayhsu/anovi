<script lang="ts">
	interface Props {
		steamSetpoint: number;
		onSetpointChange: (value: number) => void;
	}

	let { steamSetpoint, onSetpointChange }: Props = $props();
	
	// Display mode based on setpoint
	let displayMode = $derived(steamSetpoint === 0 ? 'Idle' : `${steamSetpoint}%`);
</script>

<div class="steam-control">
	<h3>Steam</h3>
	<div class="form-group">
		<label for="steam-setpoint">
			<strong>{displayMode}</strong>
		</label>
		<input
			id="steam-setpoint"
			type="range"
			min="0"
			max="100"
			step="10"
			value={steamSetpoint}
			oninput={(e) => onSetpointChange(Number(e.currentTarget.value))}
		/>
		<div class="slider-labels">
			<span>0% (Idle)</span>
			<span>100%</span>
		</div>
	</div>
</div>

<style>
	.slider-labels {
		display: flex;
		justify-content: space-between;
		font-size: 0.875rem;
		color: #a0a0a0;
		margin-top: 0.25rem;
	}
	
	label strong {
		color: #ffffff;
	}
</style>
