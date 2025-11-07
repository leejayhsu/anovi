import { hasToken, isTokenFromEnv } from '$lib/db.server.js';

export async function load() {
	return {
		tokenStatus: {
			hasToken: hasToken(),
			isFromEnv: isTokenFromEnv()
		}
	};
}

