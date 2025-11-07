// Server-side load function and form actions for settings page
import { setToken, hasToken } from '$lib/db.server.js';
import * as anova from '$lib/anova.server.js';

export async function load() {
	const hasTokenValue = hasToken();
	let discoveredDevices = anova.getDiscoveredDevices();
	
	// If token exists but no devices found, try to fetch them
	if (hasTokenValue && discoveredDevices.length === 0) {
		try {
			discoveredDevices = await anova.fetchDevices();
		} catch (error) {
			console.error('Error fetching devices:', error);
			// Continue with empty array if fetch fails
		}
	}
	
	return {
		tokenStatus: {
			hasToken: hasTokenValue
		},
		discoveredDevices
	};
}

export const actions = {
	setToken: async ({ request }) => {
		const data = await request.formData();
		const token = data.get('token')?.toString();

		if (!token) {
			return {
				success: false,
				error: 'Token is required'
			};
		}

		// Validate token format
		if (!token.startsWith('anova-')) {
			return {
				success: false,
				error: 'Token must start with "anova-" prefix'
			};
		}

		setToken(token);

		// Close existing connection to force reconnect with new token
		anova.closeConnection();

		// Try to fetch devices after setting token
		try {
			await anova.fetchDevices();
		} catch (error) {
			console.error('Error fetching devices after setting token:', error);
		}

		return {
			success: true
		};
	},

	refreshDevices: async () => {
		try {
			// Clear cache to force fresh fetch
			anova.clearDeviceCache();
			// Close connection to force reconnect
			anova.closeConnection();
			const devices = await anova.fetchDevices();
			return {
				success: true,
				devices
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}
};

