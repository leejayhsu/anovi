<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';

	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<nav class="header">
	<div class="header-content">
		<a href="/" class="logo">Anova Oven Remote Control</a>
		<div class="header-right">
			<span class="token-status" class:configured={data.tokenStatus.hasToken}>
				{data.tokenStatus.hasToken
					? data.tokenStatus.isFromEnv
						? 'Token configured (env) ✓'
						: 'Token configured ✓'
					: 'Token not configured'}
			</span>
			<a href="/settings" class="settings-link" class:active={$page.url.pathname === '/settings'}>
				⚙️ Settings
			</a>
		</div>
	</div>
</nav>

{@render children()}

<style>
	.header {
		background: white;
		border-bottom: 2px solid #e0e0e0;
		padding: 1rem 2rem;
		position: sticky;
		top: 0;
		z-index: 100;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-family: system-ui, -apple-system, sans-serif;
	}

	.logo {
		font-size: 1.25rem;
		font-weight: 600;
		color: #333;
		text-decoration: none;
		font-family: system-ui, -apple-system, sans-serif;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.token-status {
		font-size: 0.875rem;
		color: #666;
		font-family: system-ui, -apple-system, sans-serif;
	}

	.token-status.configured {
		color: #28a745;
	}

	.settings-link {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		text-decoration: none;
		color: #666;
		font-size: 1rem;
		transition: all 0.2s;
		touch-action: manipulation;
		min-height: 44px;
		display: flex;
		align-items: center;
		font-family: system-ui, -apple-system, sans-serif;
	}

	.settings-link:hover {
		background: #f0f0f0;
		color: #333;
	}

	.settings-link.active {
		background: #007bff;
		color: white;
	}

	@media (max-width: 768px) {
		.header {
			padding: 1rem;
		}

		.logo {
			font-size: 1rem;
		}
	}
</style>

