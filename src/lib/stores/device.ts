import { writable } from "svelte/store";

export interface DeviceConfig {
	deviceId: string;
	deviceVersion: "v1" | "v2";
}

function createDeviceStore() {
	const { subscribe, set, update } = writable<DeviceConfig>({
		deviceId: "",
		deviceVersion: "v2",
	});

	// Load from localStorage on initialization
	if (typeof window !== "undefined") {
		const stored = localStorage.getItem("deviceConfig");
		if (stored) {
			try {
				set(JSON.parse(stored));
			} catch (e) {
				// Invalid stored data, use defaults
			}
		}
	}

	return {
		subscribe,
		set: (value: DeviceConfig) => {
			set(value);
			if (typeof window !== "undefined") {
				localStorage.setItem("deviceConfig", JSON.stringify(value));
			}
		},
		update: (updater: (value: DeviceConfig) => DeviceConfig) => {
			update((current) => {
				const updated = updater(current);
				if (typeof window !== "undefined") {
					localStorage.setItem("deviceConfig", JSON.stringify(updated));
				}
				return updated;
			});
		},
	};
}

export const deviceConfig = createDeviceStore();
