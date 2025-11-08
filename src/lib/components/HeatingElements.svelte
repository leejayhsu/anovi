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

<div class="heating-elements">
	<h3>Heating Elements</h3>
	<div class="form-group">
		<div class="toggle-group">
			<button
				type="button"
				class="toggle-button"
				class:active={topElement}
				onclick={() => onToggle('top')}
			>
				Top
			</button>
			<button
				type="button"
				class="toggle-button"
				class:active={bottomElement}
				onclick={() => onToggle('bottom')}
			>
				Bottom
			</button>
			<button
				type="button"
				class="toggle-button"
				class:active={rearElement}
				onclick={() => onToggle('rear')}
			>
				Rear
			</button>
		</div>
		{#if !hasActiveHeatingElement}
			<p class="helper-text error-text">⚠️ At least one heating element must be active</p>
		{/if}
	</div>
</div>
