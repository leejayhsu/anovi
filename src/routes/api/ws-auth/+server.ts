// API endpoint to provide WebSocket authentication credentials
import { json } from '@sveltejs/kit';
import { getToken } from '$lib/db.server.js';

export async function GET() {
	// Get auth token from server-side storage
	const token = getToken();
	
	if (!token) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	// Ensure token starts with "anova-" prefix
	if (!token.startsWith('anova-')) {
		return json({ error: 'Invalid token format' }, { status: 500 });
	}

	return json({ token });
}

