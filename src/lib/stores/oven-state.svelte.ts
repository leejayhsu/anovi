// Client-side reactive oven state store
// This uses Svelte 5's $state rune for reactivity

import type { DeviceState } from '$lib/anova';

export interface OvenStateStore {
	deviceId: string | null;
	state: DeviceState | null;
	isLoading: boolean;
	error: string | null;
}

// Create reactive state
export const ovenState = $state<OvenStateStore>({
	deviceId: null,
	state: null,
	isLoading: false,
	error: null
});

// Helper function to update state
export function updateOvenState(deviceId: string, state: DeviceState | null) {
	ovenState.deviceId = deviceId;
	ovenState.state = state;
	ovenState.isLoading = false;
	ovenState.error = null;
}

// Helper function to set loading state
export function setOvenStateLoading(deviceId: string) {
	ovenState.deviceId = deviceId;
	ovenState.isLoading = true;
	ovenState.error = null;
}

// Helper function to set error state
export function setOvenStateError(error: string) {
	ovenState.error = error;
	ovenState.isLoading = false;
}

// Helper function to clear state
export function clearOvenState() {
	ovenState.deviceId = null;
	ovenState.state = null;
	ovenState.isLoading = false;
	ovenState.error = null;
}

