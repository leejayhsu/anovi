<script lang="ts">
	interface Props {
		value: number; // total seconds
		onChange: (value: number) => void;
		onClose: () => void;
	}

	let { value, onChange, onClose }: Props = $props();

	let hours = $state(Math.floor(value / 3600));
	let minutes = $state(Math.floor((value % 3600) / 60));
	let seconds = $state(value % 60);
	let isOpen = $state(true);

	function adjustValue(type: 'hours' | 'minutes' | 'seconds', direction: 'up' | 'down') {
		if (type === 'hours') {
			if (direction === 'up') {
				hours = (hours + 1) % 24;
			} else {
				hours = hours === 0 ? 23 : hours - 1;
			}
		} else if (type === 'minutes') {
			if (direction === 'up') {
				minutes = (minutes + 1) % 60;
			} else {
				minutes = minutes === 0 ? 59 : minutes - 1;
			}
		} else if (type === 'seconds') {
			if (direction === 'up') {
				seconds = (seconds + 1) % 60;
			} else {
				seconds = seconds === 0 ? 59 : seconds - 1;
			}
		}
	}

	function handleDone() {
		const totalSeconds = hours * 3600 + minutes * 60 + seconds;
		onChange(totalSeconds);
		onClose();
	}

	function handleCancel() {
		onClose();
	}
</script>

{#if isOpen}
	<div class="time-selector-overlay" onclick={handleCancel}>
		<div class="time-selector-container" onclick={(e) => e.stopPropagation()}>
			<div class="time-selector-header">
				<h3>Set Timer Duration</h3>
				<button class="close-btn" onclick={handleCancel}>×</button>
			</div>

			<div class="time-selector-content">
				<div class="time-column">
					<button class="arrow-btn" onclick={() => adjustValue('hours', 'up')}>▲</button>
					<div class="time-value">{hours.toString().padStart(2, '0')}</div>
					<div class="time-label">Hours</div>
					<button class="arrow-btn" onclick={() => adjustValue('hours', 'down')}>▼</button>
				</div>
				<div class="time-column">
					<button class="arrow-btn" onclick={() => adjustValue('minutes', 'up')}>▲</button>
					<div class="time-value">{minutes.toString().padStart(2, '0')}</div>
					<div class="time-label">Minutes</div>
					<button class="arrow-btn" onclick={() => adjustValue('minutes', 'down')}>▼</button>
				</div>
				<div class="time-column">
					<button class="arrow-btn" onclick={() => adjustValue('seconds', 'up')}>▲</button>
					<div class="time-value">{seconds.toString().padStart(2, '0')}</div>
					<div class="time-label">Seconds</div>
					<button class="arrow-btn" onclick={() => adjustValue('seconds', 'down')}>▼</button>
				</div>
			</div>

			<div class="time-selector-display">
				{hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds
					.toString()
					.padStart(2, '0')}
			</div>

			<div class="time-selector-actions">
				<button class="action-btn cancel-btn" onclick={handleCancel}>Cancel</button>
				<button class="action-btn done-btn" onclick={handleDone}>Done</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.time-selector-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.time-selector-container {
		background: #3a3a3a;
		border-radius: 16px;
		padding: 1.5rem;
		width: 100%;
		max-width: 500px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}

	.time-selector-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.time-selector-header h3 {
		margin: 0;
		font-size: 1.5rem;
		color: #ffffff;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 2rem;
		color: #e0e0e0;
		cursor: pointer;
		padding: 0;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		transition: background-color 0.2s;
	}

	.close-btn:hover {
		background-color: #4a4a4a;
	}

	.time-selector-content {
		display: flex;
		justify-content: space-around;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.time-column {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
	}

	.arrow-btn {
		width: 100%;
		padding: 1rem;
		border: 2px solid #555;
		border-radius: 8px;
		background: #2a2a2a;
		color: #ffffff;
		font-size: 1.5rem;
		cursor: pointer;
		transition: all 0.2s;
		touch-action: manipulation;
		min-height: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.arrow-btn:active {
		background: #007bff;
		color: white;
		border-color: #007bff;
		transform: scale(0.95);
	}

	.time-value {
		font-size: 3rem;
		font-weight: bold;
		color: #ffffff;
		min-height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.time-label {
		font-size: 0.875rem;
		color: #a0a0a0;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.time-selector-display {
		background: #2a2a2a;
		border-radius: 8px;
		padding: 1rem;
		text-align: center;
		margin-bottom: 1.5rem;
		font-size: 2rem;
		font-weight: 600;
		color: #ffffff;
		font-variant-numeric: tabular-nums;
	}

	.time-selector-actions {
		display: flex;
		gap: 0.75rem;
	}

	.action-btn {
		flex: 1;
		padding: 1rem;
		border: none;
		border-radius: 8px;
		font-size: 1.125rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		touch-action: manipulation;
		min-height: 56px;
	}

	.cancel-btn {
		background: #6c757d;
		color: white;
	}

	.cancel-btn:active {
		background: #5a6268;
		transform: scale(0.98);
	}

	.done-btn {
		background: #28a745;
		color: white;
	}

	.done-btn:active {
		background: #218838;
		transform: scale(0.98);
	}

	@media (max-width: 480px) {
		.time-selector-container {
			padding: 1rem;
		}

		.time-value {
			font-size: 2.5rem;
		}

		.time-selector-display {
			font-size: 1.5rem;
		}

		.arrow-btn {
			min-height: 60px;
		}
	}
</style>
