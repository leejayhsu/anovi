// Server-side load function and form actions for settings page
import { setToken, hasToken, isTokenFromEnv } from "$lib/db.server.js";
import * as anova from "$lib/anova.server.js";

export async function load() {
	const hasTokenValue = hasToken();
	const isFromEnv = isTokenFromEnv();
	const discoveredDevices = anova.getDiscoveredDevices();

	return {
		tokenStatus: {
			hasToken: hasTokenValue,
			isFromEnv,
		},
		discoveredDevices,
	};
}

export const actions = {
	setToken: async ({ request }) => {
		// Check if token is set via environment variable
		if (isTokenFromEnv()) {
			return {
				success: false,
				error:
					"Token is configured via environment variable (ANOVA_TOKEN or ANOVA_PERSONAL_ACCESS_TOKEN). Remove the environment variable to use database storage.",
			};
		}

		const data = await request.formData();
		const token = data.get("token")?.toString();

		if (!token) {
			return {
				success: false,
				error: "Token is required",
			};
		}

		// Validate token format
		if (!token.startsWith("anova-")) {
			return {
				success: false,
				error: 'Token must start with "anova-" prefix',
			};
		}

		setToken(token);

		return {
			success: true,
		};
	},
};
