export interface WebSocketMessage {
	command: 'RESPONSE' | 'EVENT_APO_WIFI_LIST' | 'EVENT_USER_STATE' | 'EVENT_APO_STATE';
	requestId: string;
	payload: ResponsePayload | EventApoWifiListPayload | EventUserStatePayload | EventApoStatePayload;
}

export interface ResponsePayload {
	status: string;
	error: string;
}

export interface EventApoWifiListPayload {
	devices: DeviceInfo[];
}

export interface DeviceInfo {
	cookerId: string;
	name: string;
	pairedAt: string;
	type: 'oven_v1' | 'oven_v2';
}

export interface EventUserStatePayload {
	isConnectedToAlexa: boolean;
	isConnectedToGoogleHome: boolean;
	sousVideSubscription: {
		hasValidSubscription: boolean;
		isLegacyAccount: boolean;
		renewalPeriod: string;
		productId: string;
	};
	ovenSubscription: {
		hasValidSubscription: boolean;
		isLegacyAccount: boolean;
		renewalPeriod: string;
		productId: string;
	};
}

export interface EventApoStatePayload {
	cookerId: string;
	type: 'oven_v1' | 'oven_v2';
	state: ApoState;
}

export interface ApoState {
	version: number;
	updatedTimestamp: string;
	systemInfo: SystemInfo;
	state: OvenState;
	nodes: OvenNodes;
}

export interface SystemInfo {
	online: boolean;
	hardwareVersion: string;
	powerMains: number;
	powerHertz: number;
	firmwareVersion: string;
	uiHardwareVersion: string;
	uiFirmwareVersion: string;
	firmwareUpdatedTimestamp: string;
	lastConnectedTimestamp: string;
	lastDisconnectedTimestamp: string;
	triacsFailed: boolean;
}

export interface OvenState {
	mode: string; // 'idle', 'cook', etc.
	temperatureUnit: 'F' | 'C';
	processedCommandIds: string[];
}

export interface OvenNodes {
	temperatureBulbs: TemperatureBulbs;
	timer: Timer;
	temperatureProbe: TemperatureProbe;
	steamGenerators: SteamGenerators;
	heatingElements: HeatingElements;
	fan: Fan;
	vent: Vent;
	waterTank: WaterTank;
	door: Door;
	lamp: Lamp;
	userInterfaceCircuit: UserInterfaceCircuit;
}

export interface TemperatureBulbs {
	mode: 'dry' | 'wet'; // use this to determine if we are in normal or sous-vide cook mode
	wet: WetBulb;
	dry: DryBulb;
	dryTop: DryTopBottom;
	dryBottom: DryTopBottom;
}

export interface WetBulb {
	current: Temperature;
	dosed: boolean;
	doseFailed: boolean;
	setpoint?: Temperature;
}

export interface DryBulb {
	current: Temperature;
	setpoint?: Temperature;
}

export interface DryTopBottom {
	current: Temperature;
	overheated: boolean;
	setpoint?: Temperature;
}

export interface Temperature {
	celsius: number;
	fahrenheit: number;
}

export interface Timer {
	mode: string; // 'idle', 'running', etc.
	initial: number;
	current: number;
}

export interface TemperatureProbe {
	connected: boolean;
	current?: Temperature;
	setpoint?: Temperature;
}

export interface SteamGenerators {
	mode: 'idle' | 'relative-humidity' | 'steam-percentage';
	relativeHumidity: RelativeHumidity;
	evaporator: Evaporator;
	boiler: Boiler;
}

export interface RelativeHumidity {
	current: number;
	setpoint?: number;
}

export interface Evaporator {
	failed: boolean;
	overheated: boolean;
	celsius: number;
	watts: number;
}

export interface Boiler {
	descaleRequired: boolean;
	failed: boolean;
	overheated: boolean;
	celsius: number;
	watts: number;
	dosed: boolean;
}

export interface HeatingElements {
	top: HeatingElement;
	bottom: HeatingElement;
	rear: HeatingElement;
}

export interface HeatingElement {
	on: boolean;
	failed: boolean;
	watts: number;
}

export interface Fan {
	speed: number;
	failed: boolean;
}

export interface Vent {
	open: boolean;
}

export interface WaterTank {
	empty: boolean;
}

export interface Door {
	closed: boolean;
}

export interface Lamp {
	on: boolean;
	failed: boolean;
	preference: string; // 'on', 'off', 'auto'
}

export interface UserInterfaceCircuit {
	communicationFailed: boolean;
}

// Base command structure
export interface BaseCommand {
	command: string;
	requestId: string;
	payload: {
		id: string;
		type: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		payload?: any;
	};
}

export interface StartCookV1Options {
	deviceId: string;
	stages: StartCookV1Stage[];
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
