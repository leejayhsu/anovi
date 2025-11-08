// Server-side load function and form actions
import { setToken, hasToken, isTokenFromEnv } from '$lib/db.server.js';
import * as anova from '$lib/anova.server.js';
import type {
	StartCookV1Stage,
	StartCookV2Stage
} from '$lib/anova.js';

export async function load() {
	const hasTokenValue = hasToken();
	const isFromEnv = isTokenFromEnv();
	let discoveredDevices = anova.getDiscoveredDevices();
	
	// If token exists, initialize WebSocket connection and fetch devices
	if (hasTokenValue) {
		try {
			// Initialize WebSocket connection first
			await anova.initializeConnection();
			
			// Fetch devices if not already loaded
			if (discoveredDevices.length === 0) {
				discoveredDevices = await anova.fetchDevices();
			}
			
			// Request state for all discovered devices
			for (const device of discoveredDevices) {
				try {
					await anova.requestDeviceState(device.cookerId);
				} catch (error) {
					console.error(`Error requesting state for device ${device.cookerId}:`, error);
				}
			}
		} catch (error) {
			console.error('Error initializing connection:', error);
			// Continue with empty array if fetch fails
		}
	}
	
	return {
		tokenStatus: {
			hasToken: hasTokenValue,
			isFromEnv
		},
		discoveredDevices
	};
}

export const actions = {
	getDeviceState: async ({ request }) => {
		const data = await request.formData();
		const deviceId = data.get('deviceId')?.toString();

		if (!deviceId) {
			return {
				success: false,
				error: 'Device ID is required',
				state: null
			};
		}

		try {
			// Request fresh state from device
			try {
				await anova.requestDeviceState(deviceId);
			} catch (error) {
				console.error('Error requesting device state:', error);
				// Continue to return cached state even if request fails
			}
			
			// Return the current state (might be cached or newly updated)
			const state = anova.getDeviceState(deviceId);
			return {
				success: true,
				state
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				state: null
			};
		}
	},

	setToken: async ({ request }) => {
		// Check if token is set via environment variable
		if (isTokenFromEnv()) {
			return {
				success: false,
				error: 'Token is configured via environment variable (ANOVA_TOKEN or ANOVA_PERSONAL_ACCESS_TOKEN). Remove the environment variable to use database storage.'
			};
		}

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

		// Try to initialize connection and fetch devices after setting token
		try {
			await anova.initializeConnection();
			const devices = await anova.fetchDevices();
			
			// Request state for all discovered devices
			for (const device of devices) {
				try {
					await anova.requestDeviceState(device.cookerId);
				} catch (error) {
					console.error(`Error requesting state for device ${device.cookerId}:`, error);
				}
			}
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
			
			// Re-initialize connection
			await anova.initializeConnection();
			const devices = await anova.fetchDevices();
			
			// Request state for all discovered devices
			for (const device of devices) {
				try {
					await anova.requestDeviceState(device.cookerId);
				} catch (error) {
					console.error(`Error requesting state for device ${device.cookerId}:`, error);
				}
			}
			
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
	},

	startCook: async ({ request }) => {
		const data = await request.formData();
		const deviceId = data.get('deviceId')?.toString();
		const deviceVersion = data.get('deviceVersion')?.toString() as 'v1' | 'v2';
		const stageDataJson = data.get('stageData')?.toString();

		if (!deviceId || !stageDataJson) {
			return {
				success: false,
				error: 'Missing required fields'
			};
		}

		try {
			const stageData = JSON.parse(stageDataJson);
			if (deviceVersion === 'v1') {
				await anova.startCookV1(deviceId, [stageData as StartCookV1Stage]);
			} else {
				await anova.startCookV2(deviceId, [stageData as StartCookV2Stage]);
			}
			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	},

	stopCook: async ({ request }) => {
		const data = await request.formData();
		const deviceId = data.get('deviceId')?.toString();

		if (!deviceId) {
			return {
				success: false,
				error: 'Device ID is required'
			};
		}

		try {
			await anova.stopCook(deviceId);
			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	},

	setProbe: async ({ request }) => {
		const data = await request.formData();
		const deviceId = data.get('deviceId')?.toString();
		const setpointCelsius = Number(data.get('setpointCelsius'));
		const deviceVersion = data.get('deviceVersion')?.toString() as 'v1' | 'v2';

		if (!deviceId || isNaN(setpointCelsius)) {
			return {
				success: false,
				error: 'Missing required fields'
			};
		}

		try {
			await anova.setProbe(deviceId, setpointCelsius, deviceVersion);
			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	},

	setTemperatureUnit: async ({ request }) => {
		const data = await request.formData();
		const deviceId = data.get('deviceId')?.toString();
		const unit = data.get('unit')?.toString() as 'C' | 'F';

		if (!deviceId || !unit) {
			return {
				success: false,
				error: 'Missing required fields'
			};
		}

		try {
			await anova.setTemperatureUnit(deviceId, unit);
			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}
};
