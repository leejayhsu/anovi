<script lang="ts">
	interface Option {
		value: string;
		label: string;
	}

	interface Props {
		title: string;
		options: Option[];
		selectedValue: string;
		onSelect: (value: string) => void;
		onClose: () => void;
	}

	let { title, options, selectedValue, onSelect, onClose }: Props = $props();

	function handleSelect(value: string) {
		onSelect(value);
		onClose();
	}
</script>

<div class="modal-overlay" onclick={onClose}>
	<div class="modal-container" onclick={(e) => e.stopPropagation()}>
		<div class="modal-header">
			<h3>{title}</h3>
			<button class="close-btn" onclick={onClose}>×</button>
		</div>
		
		<div class="modal-options">
			{#each options as option}
				<button
					class="option-btn"
					class:selected={selectedValue === option.value}
					onclick={() => handleSelect(option.value)}
				>
					{option.label}
					{#if selectedValue === option.value}
						<span class="checkmark">✓</span>
					{/if}
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	.modal-overlay {
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

	.modal-container {
		background: white;
		border-radius: 16px;
		padding: 1.5rem;
		width: 100%;
		max-width: 400px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.modal-header h3 {
		margin: 0;
		font-size: 1.5rem;
		color: #333;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 2rem;
		color: #666;
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
		background-color: #f0f0f0;
	}

	.modal-options {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.option-btn {
		width: 100%;
		padding: 1.25rem;
		border: 2px solid #ddd;
		border-radius: 12px;
		background: white;
		color: #333;
		font-size: 1.125rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		justify-content: space-between;
		align-items: center;
		touch-action: manipulation;
		min-height: 56px;
	}

	.option-btn:active {
		transform: scale(0.98);
	}

	.option-btn.selected {
		background: #007bff;
		color: white;
		border-color: #007bff;
	}

	.option-btn:not(.selected):hover {
		background: #f8f9fa;
		border-color: #007bff;
	}

	.checkmark {
		font-size: 1.5rem;
		font-weight: bold;
	}

	@media (max-width: 480px) {
		.modal-container {
			padding: 1rem;
		}

		.option-btn {
			padding: 1rem;
			font-size: 1rem;
		}
	}
</style>

