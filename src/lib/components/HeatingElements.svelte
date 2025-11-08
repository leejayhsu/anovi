<script lang="ts">
	interface Props {
		topElement: boolean;
		bottomElement: boolean;
		rearElement: boolean;
		hasActiveHeatingElement: boolean;
		onToggle: (element: 'top' | 'bottom' | 'rear') => void;
	}

	let { topElement, bottomElement, rearElement, hasActiveHeatingElement, onToggle }: Props =
		$props();
</script>

<section class="card">
	<h2>Heating Elements</h2>
	<div class="form-group">
		<label>Select Heating Elements</label>
		<div class="toggle-group toggle-group-vertical">
			<button
				type="button"
				class="toggle-button"
				class:active={topElement}
				onclick={() => onToggle('top')}
			>
				Top Element
			</button>
			<button
				type="button"
				class="toggle-button"
				class:active={bottomElement}
				onclick={() => onToggle('bottom')}
			>
				Bottom Element
			</button>
			<button
				type="button"
				class="toggle-button"
				class:active={rearElement}
				onclick={() => onToggle('rear')}
			>
				Rear Element
			</button>
		</div>
		{#if !hasActiveHeatingElement}
			<p class="helper-text error-text">⚠️ At least one heating element must be active</p>
		{/if}
	</div>
</section>

