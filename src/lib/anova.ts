// Anova Precision Oven API Helper Functions
// These functions create command payloads for the WebSocket API
// You'll need to implement the actual WebSocket connection logic

// Hardcoded personal access token (replace with your actual token)
export const PERSONAL_ACCESS_TOKEN = 'YOUR_TOKEN_HERE';

// Device ID (will be obtained from device discovery)
export let deviceId: string = '';

// Generate UUID v4
function generateUUID(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

// Convert Celsius to Fahrenheit
export function celsiusToFahrenheit(celsius: number): number {
	return (celsius * 9) / 5 + 32;
}

// Convert Fahrenheit to Celsius
export function fahrenheitToCelsius(fahrenheit: number): number {
	return ((fahrenheit - 32) * 5) / 9;
}

// Base command structure
interface BaseCommand {
	command: string;
	requestId: string;
	payload: {
		id: string;
		type: string;
		payload?: any;
	};
}

// Start Cook Command - Oven v1
export interface StartCookV1Stage {
	stepType: 'stage';
	id: string;
	title: string;
	description: string;
	type: 'preheat' | 'cook';
	userActionRequired: boolean;
	temperatureBulbs?: {
		mode: 'dry' | 'wet';
		dry?: {
			setpoint: {
				celsius: number;
				fahrenheit: number;
			};
		};
		wet?: {
			setpoint: {
				celsius: number;
				fahrenheit: number;
			};
		};
	};
	heatingElements?: {
		top: { on: boolean };
		bottom: { on: boolean };
		rear: { on: boolean };
	};
	fan?: {
		speed: number; // 0-100
	};
	vent?: {
		open: boolean;
	};
	rackPosition?: number; // 1-5
	stageTransitionType?: 'automatic' | 'manual';
	steamGenerators?: {
		mode: 'idle' | 'relative-humidity' | 'steam-percentage';
		relativeHumidity?: {
			setpoint: number; // 0-100
		};
		steamPercentage?: {
			setpoint: number; // 0-100
		};
	};
	timer?: {
		initial: number; // seconds
		startType?: 'immediately' | 'when-preheated' | 'manual';
	};
	probe?: {
		setpoint: {
			celsius: number;
			fahrenheit: number;
		};
	};
}

export interface StartCookV1Options {
	deviceId: string;
	stages: StartCookV1Stage[];
}

export function createStartCookV1Command(options: StartCookV1Options): BaseCommand {
	const cookId = generateUUID();
	const stages = options.stages.map((stage) => ({
		...stage,
		id: stage.id || generateUUID()
	}));

	return {
		command: 'CMD_APO_START',
		requestId: generateUUID(),
		payload: {
			id: options.deviceId,
			type: 'CMD_APO_START',
			payload: {
				cookId,
				stages
			}
		}
	};
}

// Start Cook Command - Oven v2
export interface StartCookV2Stage {
	id: string;
	do: {
		type: 'cook';
		fan?: { speed: number };
		heatingElements?: {
			top: { on: boolean };
			bottom: { on: boolean };
			rear: { on: boolean };
		};
		exhaustVent?: { state: 'open' | 'closed' };
		temperatureBulbs?: {
			mode: 'dry' | 'wet';
			dry?: { setpoint: { celsius: number } };
			wet?: { setpoint: { celsius: number } };
		};
		steamGenerators?: {
			mode: 'idle' | 'relative-humidity' | 'steam-percentage';
			relativeHumidity?: { setpoint: number };
			steamPercentage?: { setpoint: number };
		};
		timer?: {
			initial: number;
			entry?: {
				conditions: {
					and: Record<string, any>;
				};
			};
		};
	};
	exit?: {
		conditions: {
			and: Record<string, any>;
		};
	};
	entry?: {
		conditions: {
			and: Record<string, any>;
		};
	};
	title: string;
	description: string;
	rackPosition?: number;
}

export interface StartCookV2Options {
	deviceId: string;
	stages: StartCookV2Stage[];
}

export function createStartCookV2Command(options: StartCookV2Options): BaseCommand {
	const cookId = generateUUID();
	const stages = options.stages.map((stage) => ({
		...stage,
		id: stage.id || generateUUID()
	}));

	return {
		command: 'CMD_APO_START',
		requestId: generateUUID(),
		payload: {
			id: options.deviceId,
			type: 'CMD_APO_START',
			payload: {
				stages,
				cookId,
				cookerId: options.deviceId,
				cookableId: '',
				title: '',
				type: 'oven_v2',
				originSource: 'api',
				cookableType: 'manual'
			}
		}
	};
}

// Stop Cook Command
export function createStopCookCommand(deviceId: string): BaseCommand {
	return {
		command: 'CMD_APO_STOP',
		requestId: generateUUID(),
		payload: {
			id: deviceId,
			type: 'CMD_APO_STOP'
		}
	};
}

// Set Probe Command - Oven v1
export function createSetProbeV1Command(
	deviceId: string,
	setpointCelsius: number,
	setpointFahrenheit: number
): BaseCommand {
	return {
		command: 'CMD_APO_SET_PROBE',
		requestId: generateUUID(),
		payload: {
			id: deviceId,
			type: 'CMD_APO_SET_PROBE',
			payload: {
				setpoint: {
					celsius: setpointCelsius,
					fahrenheit: setpointFahrenheit
				}
			}
		}
	};
}

// Set Probe Command - Oven v2
export function createSetProbeV2Command(deviceId: string, setpointCelsius: number): BaseCommand {
	return {
		command: 'CMD_APO_SET_PROBE',
		requestId: generateUUID(),
		payload: {
			id: deviceId,
			type: 'CMD_APO_SET_PROBE',
			payload: {
				setpoint: {
					celsius: setpointCelsius
				}
			}
		}
	};
}

// Set Temperature Unit Command
export function createSetTemperatureUnitCommand(
	deviceId: string,
	unit: 'C' | 'F'
): BaseCommand {
	return {
		command: 'CMD_APO_SET_TEMPERATURE_UNIT',
		requestId: generateUUID(),
		payload: {
			id: deviceId,
			type: 'CMD_APO_SET_TEMPERATURE_UNIT',
			payload: {
				temperatureUnit: unit
			}
		}
	};
}

// Helper function to send command via WebSocket
// You'll need to implement the actual WebSocket connection
export async function sendCommand(
	command: BaseCommand,
	websocket: WebSocket | null
): Promise<void> {
	if (!websocket || websocket.readyState !== WebSocket.OPEN) {
		throw new Error('WebSocket is not connected');
	}
	websocket.send(JSON.stringify(command));
}

