# Device State Tracking Implementation

This document describes the device state tracking system that captures and displays real-time oven state from the Anova WebSocket API.

## Overview

The implementation consists of three main parts:
1. **Server-side state capture** - Listens to WebSocket messages and extracts device state
2. **Client-side reactive store** - Uses Svelte 5's `$state` rune for reactivity
3. **UI display** - Shows current temperature, humidity, timer, and more

## Architecture

### Server Side (`src/lib/anova.server.ts`)

The server maintains an in-memory cache of device states:

```typescript
const deviceStates = new Map<string, DeviceState>();
```

State is captured from WebSocket messages with commands containing `'STATE'`:
- `EVENT_APO_STATE` - Oven state updates
- `EVENT_APC_STATE` - Sous vide cooker state updates

#### State Extraction

The `handleMessage()` function parses state updates and extracts:
- **Temperature**: Current and setpoint (from `temperatureBulbs`)
- **Humidity**: Steam/humidity levels (from `steamGenerators`)
- **Status**: Current device status (cooking, idle, preheating, etc.)
- **Timer**: Remaining time and mode
- **Probe**: Temperature probe data

#### API Endpoint

A new form action `getDeviceState` in `src/routes/+page.server.ts` allows the client to fetch current state:

```typescript
export const actions = {
  getDeviceState: async ({ request }) => {
    const deviceId = data.get('deviceId')?.toString();
    const state = anova.getDeviceState(deviceId);
    return { success: true, state };
  }
}
```

### Shared Types (`src/lib/anova.ts`)

The `DeviceState` interface is defined in a shared module so it can be used by both client and server:

```typescript
export interface DeviceState {
  deviceId: string;
  temperature?: {
    current?: number;
    setpoint?: number;
    unit?: 'C' | 'F';
  };
  humidity?: number;
  status?: string;
  timer?: {
    remaining?: number;
    mode?: string;
  };
  probe?: {
    temperature?: number;
    connected?: boolean;
  };
  lastUpdated: Date | string;
  rawPayload?: any;
}
```

### Client Side (`src/lib/stores/oven-state.svelte.ts`)

A Svelte 5 reactive store using `$state` rune:

```typescript
export const ovenState = $state<OvenStateStore>({
  deviceId: null,
  state: null,
  isLoading: false,
  error: null
});
```

Helper functions for updating state:
- `updateOvenState(deviceId, state)` - Updates the state
- `setOvenStateLoading(deviceId)` - Sets loading state
- `setOvenStateError(error)` - Sets error state
- `clearOvenState()` - Clears all state

### UI Component (`src/routes/+page.svelte`)

#### Polling Mechanism

An `$effect` polls for state updates every 2 seconds when a device is selected:

```typescript
$effect(() => {
  if (!deviceId) return;
  
  const pollDeviceState = async () => {
    // Fetch state from server
    const response = await fetch('?/getDeviceState', {
      method: 'POST',
      body: formData
    });
    // Update store with new state
    updateOvenState(deviceId, result.data.state);
  };
  
  pollDeviceState(); // Poll immediately
  const intervalId = setInterval(pollDeviceState, 2000); // Then every 2 seconds
  
  return () => clearInterval(intervalId); // Cleanup
});
```

#### Display

The current state is displayed in a "Current State" card in the actions sidebar showing:
- **Temperature**: Current and target (in both °C and °F)
- **Humidity**: Current humidity percentage
- **Status**: Device status with color coding (cooking = green, preheating = yellow, idle = gray)
- **Timer**: Remaining time in HH:MM:SS format
- **Probe**: Temperature probe readings if connected
- **Last Updated**: Timestamp of last state update

## State Messages

Based on the Python implementation example, state messages from the WebSocket have this structure:

```json
{
  "command": "EVENT_APO_STATE",
  "payload": {
    "cookerId": "device-id",
    "temperature": 180.5,
    "temperatureBulbs": {
      "mode": "dry",
      "dry": {
        "current": { "celsius": 180.5 },
        "setpoint": { "celsius": 200 }
      }
    },
    "status": "cooking",
    "timer": {
      "remaining": 1200,
      "mode": "running"
    },
    "steamGenerators": {
      "mode": "relative-humidity",
      "relativeHumidity": { "setpoint": 50 }
    }
  }
}
```

## Usage

1. **Select a device** - Device state polling starts automatically
2. **View current state** - The "Current State" card updates every 2 seconds
3. **Monitor cooking** - Temperature, humidity, and timer are shown in real-time

## Benefits of This Approach

1. **Reactive**: Uses Svelte 5's `$state` for automatic UI updates
2. **Type-safe**: Shared TypeScript types between client and server
3. **Server-authoritative**: State is captured server-side from the WebSocket
4. **Simple polling**: 2-second polling provides near real-time updates without complexity
5. **No WebSocket on client**: Avoids managing WebSocket connections in the browser

## Future Enhancements

Potential improvements:
1. **Server-Sent Events (SSE)**: Push updates to client instead of polling
2. **WebSocket in browser**: Direct WebSocket connection from browser to Anova
3. **State history**: Store and visualize temperature/humidity over time
4. **Alerts**: Notify when target temperature is reached or timer completes
5. **Chart visualization**: Real-time temperature/humidity graphs

