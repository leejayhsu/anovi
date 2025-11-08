// Client-side WebSocket store for Anova API
import { writable } from 'svelte/store';
import type { DeviceState } from '$lib/anova.js';

interface DeviceInfo {
	cookerId: string;
	name: string;
	pairedAt: string;
	type: 'oven_v1' | 'oven_v2';
}

interface WebSocketState {
	connected: boolean;
	devices: Map<string, DeviceInfo>;
	deviceStates: Map<string, DeviceState>;
	error: string | null;
}

function createWebSocketStore() {
	const initialState: WebSocketState = {
		connected: false,
		devices: new Map(),
		deviceStates: new Map(),
		error: null
	};

	const { subscribe, set, update } = writable<WebSocketState>(initialState);
	
	let ws: WebSocket | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let reconnectAttempts = 0;
	const maxReconnectAttempts = 5;
	const reconnectDelay = 3000;

	function getWebSocketUrl(token: string): string {
		const baseUrl = 'wss://devices.anovaculinary.io';
		const params = new URLSearchParams({
			token: token,
			supportedAccessories: 'APO' // Anova Precision Oven
		});
		return `${baseUrl}?${params.toString()}`;
	}

	function handleMessage(message: any): void {
		// Handle device discovery messages
		if (message.command === 'EVENT_APO_WIFI_LIST' && Array.isArray(message.payload)) {
			update(state => {
				const newDevices = new Map(state.devices);
				for (const device of message.payload) {
					if (device.cookerId && device.type) {
						const deviceInfo: DeviceInfo = {
							cookerId: device.cookerId,
							name: device.name || 'Anova Precision Oven',
							pairedAt: device.pairedAt || new Date().toISOString(),
							type: device.type === 'oven_v1' ? 'oven_v1' : 'oven_v2'
						};
						newDevices.set(device.cookerId, deviceInfo);
					}
				}
				return { ...state, devices: newDevices };
			});
		}

		// Handle state update messages (commands containing 'STATE')
		if (message.command && typeof message.command === 'string' && message.command.includes('STATE')) {
			const payload = message.payload;
			
			// Extract device ID from payload
			let deviceId: string | undefined;
			if (typeof payload === 'object' && payload !== null) {
				deviceId = payload.cookerId || payload.id || payload.deviceId;
			}

			if (deviceId) {
				update(state => {
					const newDeviceStates = new Map(state.deviceStates);
					
					// Parse and store state information
					const deviceState: DeviceState = {
						deviceId,
						lastUpdated: new Date(),
						rawPayload: payload
					};

					// All sensor data is in payload.state.nodes
					const nodes = payload.state?.nodes;

					// Extract mode
					if (payload.state?.mode) {
						deviceState.mode = payload.state.mode;
					}

					// Extract temperature bulbs information
					if (nodes?.temperatureBulbs) {
						deviceState.temperatureBulbs = {
							mode: nodes.temperatureBulbs.mode,
							dry: nodes.temperatureBulbs.dry ? {
								current: nodes.temperatureBulbs.dry.current,
								setpoint: nodes.temperatureBulbs.dry.setpoint
							} : undefined,
							wet: nodes.temperatureBulbs.wet ? {
								current: nodes.temperatureBulbs.wet.current,
								setpoint: nodes.temperatureBulbs.wet.setpoint
							} : undefined
						};
					}

					// Extract steam generators / humidity information
					if (nodes?.steamGenerators) {
						deviceState.steamGenerators = {
							mode: nodes.steamGenerators.mode,
							relativeHumidity: nodes.steamGenerators.relativeHumidity,
							steamPercentage: nodes.steamGenerators.steamPercentage
						};
					}

					// Extract temperature probe information
					if (nodes?.temperatureProbe) {
						deviceState.temperatureProbe = {
							current: nodes.temperatureProbe.current,
							setpoint: nodes.temperatureProbe.setpoint,
							connected: nodes.temperatureProbe.connected !== false
						};
					}

					// Extract timer information
					if (nodes?.timer) {
						deviceState.timer = {
							mode: nodes.timer.mode || 'idle',
							current: nodes.timer.current || 0,
							initial: nodes.timer.initial || 0
						};
					}

					// Extract cook information
					if (payload.state?.cook) {
						deviceState.cook = {
							activeStageId: payload.state.cook.activeStageId,
							activeStageIndex: payload.state.cook.activeStageIndex,
							activeStageSecondsElapsed: payload.state.cook.activeStageSecondsElapsed,
							secondsElapsed: payload.state.cook.secondsElapsed,
							cookId: payload.state.cook.cookId
						};
					}

					// Extract heating elements
					if (nodes?.heatingElements) {
						deviceState.heatingElements = nodes.heatingElements;
					}

					// Extract fan
					if (nodes?.fan) {
						deviceState.fan = nodes.fan;
					}

					// Extract vent
					if (nodes?.vent) {
						deviceState.vent = nodes.vent;
					}

					// Extract door
					if (nodes?.door) {
						deviceState.door = nodes.door;
					}

					// Extract lamp
					if (nodes?.lamp) {
						deviceState.lamp = nodes.lamp;
					}

					// Extract water tank
					if (nodes?.waterTank) {
						deviceState.waterTank = nodes.waterTank;
					}

					newDeviceStates.set(deviceId, deviceState);
					console.log(`[WebSocket] State update for device ${deviceId}`, deviceState);
					
					return { ...state, deviceStates: newDeviceStates };
				});
			}
		}
	}

	async function connect() {
		try {
			// Reset error state
			update(state => ({ ...state, error: null }));

			// Fetch auth credentials from server
			const response = await fetch('/api/ws-auth');
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to get auth credentials');
			}
			
			const { token } = await response.json();
			
			// Connect to Anova WebSocket with auth
			const wsUrl = getWebSocketUrl(token);
			ws = new WebSocket(wsUrl);
			
			ws.onopen = () => {
				console.log('[WebSocket] Connected to Anova');
				reconnectAttempts = 0;
				update(state => ({ ...state, connected: true, error: null }));
			};
			
			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					handleMessage(data);
				} catch (error) {
					console.error('[WebSocket] Error parsing message:', error);
				}
			};
			
			ws.onerror = (error) => {
				console.error('[WebSocket] Error:', error);
				update(state => ({ ...state, error: 'WebSocket connection error' }));
			};
			
			ws.onclose = (event) => {
				console.log('[WebSocket] Closed:', event.code, event.reason);
				update(state => ({ ...state, connected: false }));
				
				// Auto-reconnect with exponential backoff
				if (reconnectAttempts < maxReconnectAttempts) {
					reconnectAttempts++;
					const delay = reconnectDelay * Math.pow(1.5, reconnectAttempts - 1);
					console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
					reconnectTimer = setTimeout(() => connect(), delay);
				} else {
					console.error('[WebSocket] Max reconnect attempts reached');
					update(state => ({ ...state, error: 'Failed to reconnect after multiple attempts' }));
				}
			};
		} catch (error) {
			console.error('[WebSocket] Connection error:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
			update(state => ({ ...state, error: errorMessage, connected: false }));
			
			// Retry connection if not max attempts
			if (reconnectAttempts < maxReconnectAttempts) {
				reconnectAttempts++;
				const delay = reconnectDelay * Math.pow(1.5, reconnectAttempts - 1);
				console.log(`[WebSocket] Retrying connection in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
				reconnectTimer = setTimeout(() => connect(), delay);
			}
		}
	}

	function disconnect() {
		if (reconnectTimer) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
		if (ws) {
			ws.close();
			ws = null;
		}
		reconnectAttempts = 0;
		update(state => ({ ...state, connected: false }));
	}

	function send(message: any) {
		if (ws && ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(message));
			return true;
		}
		console.warn('[WebSocket] Cannot send message, not connected');
		return false;
	}

	function requestDeviceState(deviceId: string) {
		const command = {
			command: 'CMD_APO_REQUEST_STATE',
			payload: {
				cookerId: deviceId
			}
		};
		return send(command);
	}

	function sendCommand(command: any) {
		return send(command);
	}

	return {
		subscribe,
		connect,
		disconnect,
		send,
		sendCommand,
		requestDeviceState
	};
}

export const wsStore = createWebSocketStore();

