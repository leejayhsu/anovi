// Client-side WebSocket store for Anova API
import { writable } from 'svelte/store';
import type { ApoState, BaseCommand, EventApoStatePayload, WebSocketMessage } from '$lib/types';

interface WebSocketState {
	connected: boolean;
	deviceId: string;
	deviceState?: ApoState;
	error: string | null;
}

function createWebSocketStore() {
	const initialState: WebSocketState = {
		connected: false,
		deviceId: '',
		error: null
	};

	const { subscribe, update } = writable<WebSocketState>(initialState);

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

	function handleMessage(message: WebSocketMessage): void {
		// Handle device discovery messages - just take the first device
		if (message.command === 'EVENT_APO_WIFI_LIST' && Array.isArray(message.payload)) {
			if (message.payload.length > 0) {
				const device = message.payload[0];
				if (device.cookerId) {
					update((state) => ({
						...state,
						deviceId: device.cookerId
					}));
					console.log(`[WebSocket] Discovered device: ${device.cookerId}`);
				}
			}
		}

		// Handle state update messages - store raw payload.state
		if (message.command === 'EVENT_APO_STATE') {
			const payload = message.payload as EventApoStatePayload;
			const deviceId = payload?.cookerId;

			if (deviceId && payload.state) {
				update((state) => ({
					...state,
					deviceId,
					deviceState: payload.state
				}));
				console.log(`[WebSocket] State update for device ${deviceId}`);
			}
		}
	}

	async function connect() {
		try {
			// Reset error state
			update((state) => ({ ...state, error: null }));

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
				update((state) => ({ ...state, connected: true, error: null }));
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
				update((state) => ({ ...state, error: 'WebSocket connection error' }));
			};

			ws.onclose = (event) => {
				console.log('[WebSocket] Closed:', event.code, event.reason);
				update((state) => ({ ...state, connected: false }));

				// Auto-reconnect with exponential backoff
				if (reconnectAttempts < maxReconnectAttempts) {
					reconnectAttempts++;
					const delay = reconnectDelay * Math.pow(1.5, reconnectAttempts - 1);
					console.log(
						`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`
					);
					reconnectTimer = setTimeout(() => connect(), delay);
				} else {
					console.error('[WebSocket] Max reconnect attempts reached');
					update((state) => ({
						...state,
						error: 'Failed to reconnect after multiple attempts'
					}));
				}
			};
		} catch (error) {
			console.error('[WebSocket] Connection error:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
			update((state) => ({ ...state, error: errorMessage, connected: false }));

			// Retry connection if not max attempts
			if (reconnectAttempts < maxReconnectAttempts) {
				reconnectAttempts++;
				const delay = reconnectDelay * Math.pow(1.5, reconnectAttempts - 1);
				console.log(
					`[WebSocket] Retrying connection in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`
				);
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
		update((state) => ({ ...state, connected: false }));
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

	function sendCommand(command: BaseCommand) {
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
