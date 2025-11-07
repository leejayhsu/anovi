// Server-only Anova API module
// This handles WebSocket communication with Anova servers
// Token is retrieved from database server-side

import WebSocket from 'ws';
import { getToken, saveDevices, getDevices } from './db.server.js';
import type {
	StartCookV1Stage,
	StartCookV2Stage,
	BaseCommand
} from './anova.js';
import {
	createStartCookV1Command,
	createStartCookV2Command,
	createStopCookCommand,
	createSetProbeV1Command,
	createSetProbeV2Command,
	createSetTemperatureUnitCommand
} from './anova.js';

// WebSocket connection - single connection for all devices
let ws: WebSocket | null = null;
let connectionPromise: Promise<WebSocket> | null = null;
const messageHandlers = new Set<(message: any) => void>();

// Device information cache
export interface DeviceInfo {
	cookerId: string;
	name: string;
	pairedAt: string;
	type: 'oven_v1' | 'oven_v2';
}

const devices = new Map<string, DeviceInfo>();

// Promise resolver for device discovery
let deviceDiscoveryResolver: ((devices: DeviceInfo[]) => void) | null = null;
let deviceDiscoveryTimeout: NodeJS.Timeout | null = null;

function getWebSocketUrl(token: string): string {
	const baseUrl = 'wss://devices.anovaculinary.io';
	const params = new URLSearchParams({
		token: token,
		supportedAccessories: 'APO' // Anova Precision Oven
	});
	return `${baseUrl}?${params.toString()}`;
}

async function getConnection(): Promise<WebSocket> {
	// If we have an active connection, return it
	if (ws && ws.readyState === WebSocket.OPEN) {
		return ws;
	}

	// If a connection is already in progress, wait for it
	if (connectionPromise) {
		return connectionPromise;
	}

	// Start a new connection
	connectionPromise = (async () => {
		const token = getToken();
		if (!token) {
			throw new Error('No token configured. Please set your Anova token first.');
		}

		// Ensure token starts with "anova-" prefix
		if (!token.startsWith('anova-')) {
			throw new Error('Token must start with "anova-" prefix');
		}

		return new Promise<WebSocket>((resolve, reject) => {
			const wsUrl = getWebSocketUrl(token);
			const newWs = new WebSocket(wsUrl);

			const timeout = setTimeout(() => {
				newWs.close();
				reject(new Error('WebSocket connection timeout'));
			}, 10000); // 10 second timeout

			newWs.on('open', () => {
				clearTimeout(timeout);
				ws = newWs;
				connectionPromise = null;
				resolve(newWs);
			});

			newWs.on('error', (error) => {
				clearTimeout(timeout);
				connectionPromise = null;
				reject(new Error(`WebSocket connection failed: ${error.message}`));
			});

			newWs.on('close', () => {
				ws = null;
				connectionPromise = null;
				devices.clear();
			});

			newWs.on('message', (data: WebSocket.Data) => {
				try {
					const message = JSON.parse(data.toString());
					handleMessage(message);
				} catch (error) {
					console.error('Error parsing WebSocket message:', error);
				}
			});
		});
	})();

	try {
		return await connectionPromise;
	} catch (error) {
		connectionPromise = null;
		throw error;
	}
}

function handleMessage(message: any): void {
	// Handle device discovery messages
	if (message.command === 'EVENT_APO_WIFI_LIST' && Array.isArray(message.payload)) {
		const discoveredDevices: DeviceInfo[] = [];
		for (const device of message.payload) {
			if (device.cookerId && device.type) {
				const deviceInfo: DeviceInfo = {
					cookerId: device.cookerId,
					name: device.name || 'Anova Precision Oven',
					pairedAt: device.pairedAt || new Date().toISOString(),
					type: device.type === 'oven_v1' ? 'oven_v1' : 'oven_v2'
				};
				devices.set(device.cookerId, deviceInfo);
				discoveredDevices.push(deviceInfo);
			}
		}
		
		// Save devices to database
		if (discoveredDevices.length > 0) {
			saveDevices(discoveredDevices);
		}
		
		// Resolve device discovery promise if waiting
		if (deviceDiscoveryResolver && discoveredDevices.length > 0) {
			deviceDiscoveryResolver(discoveredDevices);
			deviceDiscoveryResolver = null;
			if (deviceDiscoveryTimeout) {
				clearTimeout(deviceDiscoveryTimeout);
				deviceDiscoveryTimeout = null;
			}
		}
	}

	// Notify all handlers
	for (const handler of messageHandlers) {
		try {
			handler(message);
		} catch (error) {
			console.error('Error in message handler:', error);
		}
	}
}

async function sendCommand(command: BaseCommand, deviceId: string): Promise<void> {
	const ws = await getConnection();
	
	if (ws.readyState !== WebSocket.OPEN) {
		throw new Error('WebSocket is not connected');
	}

	// Send the command
	ws.send(JSON.stringify(command));
}

// Export function to get discovered devices
// Returns devices from memory cache first, then from database
export function getDiscoveredDevices(): DeviceInfo[] {
	const memoryDevices = Array.from(devices.values());
	if (memoryDevices.length > 0) {
		return memoryDevices;
	}
	// Fall back to database
	return getDevices();
}

// Proactively fetch devices by connecting to WebSocket and waiting for device list
export async function fetchDevices(): Promise<DeviceInfo[]> {
	const token = getToken();
	if (!token) {
		throw new Error('No token configured. Please set your Anova token first.');
	}

	// If we already have devices in memory, return them
	const memoryDevices = Array.from(devices.values());
	if (memoryDevices.length > 0) {
		return memoryDevices;
	}

	// If we have a connection and it's open, wait for devices
	if (ws && ws.readyState === WebSocket.OPEN) {
		// Wait for device discovery message
		return new Promise<DeviceInfo[]>((resolve, reject) => {
			const timeout = setTimeout(() => {
				// If no devices found, return empty array or database devices
				const dbDevices = getDevices();
				resolve(dbDevices);
			}, 5000); // 5 second timeout

			deviceDiscoveryResolver = (discoveredDevices: DeviceInfo[]) => {
				clearTimeout(timeout);
				resolve(discoveredDevices);
			};
		});
	}

	// Establish connection and wait for devices
	try {
		const connection = await getConnection();
		
		// Wait for device discovery message
		return new Promise<DeviceInfo[]>((resolve, reject) => {
			deviceDiscoveryTimeout = setTimeout(() => {
				// If no devices found, return empty array or database devices
				const dbDevices = getDevices();
				deviceDiscoveryResolver = null;
				resolve(dbDevices);
			}, 10000); // 10 second timeout

			deviceDiscoveryResolver = (discoveredDevices: DeviceInfo[]) => {
				if (deviceDiscoveryTimeout) {
					clearTimeout(deviceDiscoveryTimeout);
					deviceDiscoveryTimeout = null;
				}
				resolve(discoveredDevices);
			};
		});
	} catch (error) {
		// If connection fails, return devices from database
		return getDevices();
	}
}

// Export function to check if a device is known
export function isDeviceKnown(deviceId: string): boolean {
	return devices.has(deviceId);
}

// Clear device cache to force fresh fetch
export function clearDeviceCache(): void {
	devices.clear();
}

export async function startCookV1(
	deviceId: string,
	stages: StartCookV1Stage[]
): Promise<void> {
	const command = createStartCookV1Command({ deviceId, stages });
	await sendCommand(command, deviceId);
}

export async function startCookV2(
	deviceId: string,
	stages: StartCookV2Stage[]
): Promise<void> {
	const command = createStartCookV2Command({ deviceId, stages });
	await sendCommand(command, deviceId);
}

export async function stopCook(deviceId: string): Promise<void> {
	const command = createStopCookCommand(deviceId);
	await sendCommand(command, deviceId);
}

export async function setProbe(
	deviceId: string,
	setpointCelsius: number,
	deviceVersion: 'v1' | 'v2'
): Promise<void> {
	let command: BaseCommand;
	if (deviceVersion === 'v1') {
		const setpointFahrenheit = (setpointCelsius * 9) / 5 + 32;
		command = createSetProbeV1Command(deviceId, setpointCelsius, setpointFahrenheit);
	} else {
		command = createSetProbeV2Command(deviceId, setpointCelsius);
	}
	await sendCommand(command, deviceId);
}

export async function setTemperatureUnit(
	deviceId: string,
	unit: 'C' | 'F'
): Promise<void> {
	const command = createSetTemperatureUnitCommand(deviceId, unit);
	await sendCommand(command, deviceId);
}

// Cleanup function to close WebSocket connection
export function closeConnection(): void {
	if (ws) {
		ws.close();
		ws = null;
	}
	connectionPromise = null;
	devices.clear();
}

// Cleanup on process exit
process.on('exit', () => {
	closeConnection();
});

process.on('SIGINT', () => {
	closeConnection();
	process.exit(0);
});

process.on('SIGTERM', () => {
	closeConnection();
	process.exit(0);
});
