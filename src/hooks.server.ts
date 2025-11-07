import type { Handle } from '@sveltejs/kit';

/**
 * Server hooks to configure HTTP headers for iframe embedding
 * This allows the app to be embedded in Home Assistant's webpage card
 */
export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	// Allow iframe embedding by not setting X-Frame-Options
	// and explicitly allowing frame-ancestors in CSP
	response.headers.set(
		'Content-Security-Policy',
		"frame-ancestors *;"
	);

	// Ensure no X-Frame-Options header is set (which would block embedding)
	// SvelteKit doesn't set this by default, but we explicitly ensure it's not present
	response.headers.delete('X-Frame-Options');

	return response;
};

