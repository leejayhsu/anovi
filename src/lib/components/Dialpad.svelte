<script lang="ts">
	interface Props {
		value: number;
		min?: number;
		max?: number;
		unit?: string;
		onChange: (value: number) => void;
		onClose: () => void;
	}

	let { value, min = 0, max = 999, unit = '', onChange, onClose }: Props = $props();

	let displayValue = $state(value.toString());
	let isOpen = $state(true);

	function handleDigit(digit: number) {
		const newValue = displayValue + digit.toString();
		const numValue = parseInt(newValue, 10);

		if (numValue <= max) {
			displayValue = newValue;
		}
	}

	function handleBackspace() {
		if (displayValue.length > 0) {
			displayValue = displayValue.slice(0, -1);
		}
	}

	function handleClear() {
		displayValue = '';
	}

	function handleDone() {
		const numValue = parseInt(displayValue, 10) || min;
		const clampedValue = Math.max(min, Math.min(max, numValue));
		onChange(clampedValue);
		onClose();
	}

	function handleCancel() {
		onClose();
	}

	function handleOverlayKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleCancel();
		}
	}

	function handleContainerKeydown(event: KeyboardEvent) {
		// Stop propagation for keyboard events on the container
		event.stopPropagation();
	}
</script>

{#if isOpen}
	<div
		class="dialpad-overlay"
		role="button"
		tabindex="0"
		aria-label="Close dialpad"
		onclick={handleCancel}
		onkeydown={handleOverlayKeydown}
	>
		<div
			class="dialpad-container"
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-labelledby="dialpad-title"
			onclick={(e) => e.stopPropagation()}
			onkeydown={handleContainerKeydown}
		>
			<div class="dialpad-header">
				<h3 id="dialpad-title">Enter Temperature</h3>
				<button class="close-btn" onclick={handleCancel}>×</button>
			</div>

			<div class="dialpad-display">
				<span class="display-value">{displayValue || '0'}</span>
				{#if unit}
					<span class="unit">{unit}</span>
				{/if}
			</div>

			<div class="dialpad-content">
				<div class="dialpad-grid">
					<button class="dialpad-btn" onclick={() => handleDigit(1)}>1</button>
					<button class="dialpad-btn" onclick={() => handleDigit(2)}>2</button>
					<button class="dialpad-btn" onclick={() => handleDigit(3)}>3</button>
					<button class="dialpad-btn" onclick={() => handleDigit(4)}>4</button>
					<button class="dialpad-btn" onclick={() => handleDigit(5)}>5</button>
					<button class="dialpad-btn" onclick={() => handleDigit(6)}>6</button>
					<button class="dialpad-btn" onclick={() => handleDigit(7)}>7</button>
					<button class="dialpad-btn" onclick={() => handleDigit(8)}>8</button>
					<button class="dialpad-btn" onclick={() => handleDigit(9)}>9</button>
					<button class="dialpad-btn clear-btn" onclick={handleClear}>C</button>
					<button class="dialpad-btn" onclick={() => handleDigit(0)}>0</button>
					<button class="dialpad-btn backspace-btn" onclick={handleBackspace}>⌫</button>
				</div>

				<div class="dialpad-actions">
					<button class="action-btn done-btn" onclick={handleDone}>Done</button>
					<button class="action-btn cancel-btn" onclick={handleCancel}>Cancel</button>
				</div>
			</div>

			<div class="dialpad-range">
				Range: {min} - {max}
				{unit}
			</div>
		</div>
	</div>
{/if}

<style>
	.dialpad-overlay {
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

	.dialpad-container {
		background: #3a3a3a;
		border-radius: 16px;
		padding: 1rem;
		width: 100%;
		max-width: 450px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
		display: flex;
		flex-direction: column;
	}

	.dialpad-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		flex-shrink: 0;
	}

	.dialpad-header h3 {
		margin: 0;
		font-size: 1.25rem;
		color: #ffffff;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.75rem;
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

	.dialpad-display {
		background: #2a2a2a;
		border-radius: 8px;
		padding: 1rem;
		text-align: center;
		margin-bottom: 1rem;
		min-height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.display-value {
		font-size: 2.5rem;
		font-weight: bold;
		color: #ffffff;
	}

	.unit {
		font-size: 1.75rem;
		color: #e0e0e0;
	}

	.dialpad-content {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1rem;
		align-items: stretch;
		flex: 1;
		min-height: 0;
	}

	.dialpad-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
		flex: 1;
	}

	.dialpad-btn {
		aspect-ratio: 1;
		border: 2px solid #555;
		border-radius: 12px;
		font-size: 1.25rem;
		font-weight: 600;
		background: #2a2a2a;
		color: #ffffff;
		cursor: pointer;
		transition: all 0.2s;
		touch-action: manipulation;
		min-height: 50px;
	}

	.dialpad-btn:active {
		background: #007bff;
		color: white;
		transform: scale(0.95);
	}

	.clear-btn {
		background: linear-gradient(135deg, #f5da6f 0%, #ea8c00 100%) !important;
		color: white;
		border: none !important;
	}

	.clear-btn:active {
		background: linear-gradient(135deg, #957d26 0%, #a15101 100%) !important;
		transform: scale(0.95);
	}

	.backspace-btn {
		background: linear-gradient(135deg, #f96b6b 0%, #c62828 100%) !important;
		color: white;
		border: none !important;
		font-size: 1.25rem;
	}

	.backspace-btn:active {
		background: linear-gradient(135deg, #9f4444 0%, #621414 100%) !important;
		transform: scale(0.95);
	}

	.dialpad-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 80px;
	}

	.action-btn {
		padding: 0.875rem 1.25rem;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		touch-action: manipulation;
		flex: 1;
		white-space: nowrap;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 0;
	}

	.cancel-btn {
		background: linear-gradient(135deg, #9dabba 0%, #41474c 100%) !important;
		color: white;
		border: none !important;
	}

	.cancel-btn:active {
		background: linear-gradient(135deg, #505860 0%, #0c0d0e 100%) !important;
		transform: scale(0.98);
	}

	.done-btn {
		background: linear-gradient(135deg, #39e261 0%, #155a25 100%) !important;
		color: white;
		border: none !important;
	}

	.done-btn:active {
		background: linear-gradient(135deg, #1c7631 0%, #0e3918 100%) !important;
		transform: scale(0.98);
	}

	.dialpad-range {
		text-align: center;
		font-size: 0.875rem;
		color: #a0a0a0;
		flex-shrink: 0;
	}

	@media (max-width: 480px) {
		.dialpad-container {
			padding: 0.875rem;
			max-width: 100%;
		}

		.dialpad-content {
			flex-direction: column;
		}

		.dialpad-actions {
			flex-direction: row;
			width: 100%;
		}

		.action-btn {
			flex: 1;
		}

		.display-value {
			font-size: 2rem;
		}

		.unit {
			font-size: 1.5rem;
		}

		.dialpad-btn {
			min-height: 60px;
			font-size: 1.5rem;
		}
	}
</style>
