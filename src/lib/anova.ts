// Anova Precision Oven API Helper Functions
// These functions create command payloads for the WebSocket API
// Token authentication is handled server-side via db.server.ts

import { v4 as uuidv4 } from "uuid";
import type {
	BaseCommand,
	StartCookV1Options,
	StartCookV1Stage,
	StartCookV2Options,
} from "./types";

// Device ID (will be obtained from device discovery)
export let deviceId: string = "";

// Generate UUID v4 - uses uuid library which works in both browser and Node.js
export function generateUUID(): string {
	return uuidv4();
}

// Convert Celsius to Fahrenheit
export function celsiusToFahrenheit(celsius: number): number {
	return (celsius * 9) / 5 + 32;
}

// Convert Fahrenheit to Celsius
export function fahrenheitToCelsius(fahrenheit: number): number {
	return ((fahrenheit - 32) * 5) / 9;
}

export function createStartCookV1Command(
	options: StartCookV1Options,
): BaseCommand {
	const cookId = generateUUID();
	const stages = options.stages.map((stage) => ({
		...stage,
		id: stage.id || generateUUID(),
	}));

	return {
		command: "CMD_APO_START",
		requestId: generateUUID(),
		payload: {
			id: options.deviceId,
			type: "CMD_APO_START",
			payload: {
				cookId,
				stages,
			},
		},
	};
}

export function createStartCookV2Command(
	options: StartCookV2Options,
): BaseCommand {
	const cookId = generateUUID();
	const stages = options.stages.map((stage) => ({
		...stage,
		id: stage.id || generateUUID(),
	}));

	return {
		command: "CMD_APO_START",
		requestId: generateUUID(),
		payload: {
			id: options.deviceId,
			type: "CMD_APO_START",
			payload: {
				stages,
				cookId,
				cookerId: options.deviceId,
				cookableId: "",
				title: "",
				type: "oven_v2",
				originSource: "api",
				cookableType: "manual",
			},
		},
	};
}

// Stop Cook Command
export function createStopCookCommand(deviceId: string): BaseCommand {
	return {
		command: "CMD_APO_STOP",
		requestId: generateUUID(),
		payload: {
			id: deviceId,
			type: "CMD_APO_STOP",
		},
	};
}

// Set Probe Command - Oven v1
export function createSetProbeV1Command(
	deviceId: string,
	setpointCelsius: number,
	setpointFahrenheit: number,
): BaseCommand {
	return {
		command: "CMD_APO_SET_PROBE",
		requestId: generateUUID(),
		payload: {
			id: deviceId,
			type: "CMD_APO_SET_PROBE",
			payload: {
				setpoint: {
					celsius: setpointCelsius,
					fahrenheit: setpointFahrenheit,
				},
			},
		},
	};
}

// Set Probe Command - Oven v2
export function createSetProbeV2Command(
	deviceId: string,
	setpointCelsius: number,
): BaseCommand {
	return {
		command: "CMD_APO_SET_PROBE",
		requestId: generateUUID(),
		payload: {
			id: deviceId,
			type: "CMD_APO_SET_PROBE",
			payload: {
				setpoint: {
					celsius: setpointCelsius,
				},
			},
		},
	};
}

// Set Temperature Unit Command
export function createSetTemperatureUnitCommand(
	deviceId: string,
	unit: "C" | "F",
): BaseCommand {
	return {
		command: "CMD_APO_SET_TEMPERATURE_UNIT",
		requestId: generateUUID(),
		payload: {
			id: deviceId,
			type: "CMD_APO_SET_TEMPERATURE_UNIT",
			payload: {
				temperatureUnit: unit,
			},
		},
	};
}

// Helper function to send command via WebSocket
// You'll need to implement the actual WebSocket connection
export async function sendCommand(
	command: BaseCommand,
	websocket: WebSocket | null,
): Promise<void> {
	if (!websocket || websocket.readyState !== WebSocket.OPEN) {
		throw new Error("WebSocket is not connected");
	}
	websocket.send(JSON.stringify(command));
}
