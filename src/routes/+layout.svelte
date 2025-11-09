<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import '$lib/styles/components.css';
	import { Settings } from 'lucide-svelte';

	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<nav class="header">
	<div class="header-content">
		<a href={resolve('/')} class="logo">Anova Oven Remote Control</a>
		<div class="header-right">
			<a
				href={resolve('/settings')}
				class="settings-link"
				class:active={$page.url.pathname === '/settings'}
			>
				<Settings size={20} />
				<span>Settings</span>
			</a>
		</div>
	</div>
</nav>

{@render children()}

<style>
	.header-content {
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
	}
	.logo {
		font-size: 1rem;
		font-weight: 600;
		color: #333;
		text-decoration: none;
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
	}

	.settings-link {
		padding: 0.375rem 0.875rem;
		border-radius: 6px;
		text-decoration: none;
		color: #666;
		font-size: 0.95rem;
		transition: all 0.2s;
		touch-action: manipulation;
		min-height: 36px;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
	}

	.settings-link:hover {
		background: #f0f0f0;
		color: #333;
	}

	.settings-link.active {
		background: #007bff;
		color: white;
	}
</style>
