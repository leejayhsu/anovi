// Server-only Anova API module
// This module only handles server-side device storage/retrieval
// WebSocket communication is handled client-side

import { getDevices } from "./db.server.js";

// Device information
export interface DeviceInfo {
	cookerId: string;
	name: string;
	pairedAt: string;
	type: "oven_v1" | "oven_v2";
}

// Export function to get devices from database
export function getDiscoveredDevices(): DeviceInfo[] {
	return getDevices();
}
