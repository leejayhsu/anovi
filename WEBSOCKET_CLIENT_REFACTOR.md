# WebSocket Client-Side Refactor

## Summary

Moved the WebSocket connection management from server-side to client-side while keeping authentication secure on the server.

## Changes Made

### 1. New Server Endpoint for Authentication
**File: `/src/routes/api/ws-auth/+server.ts`**
- Created a secure endpoint that provides the WebSocket auth token
- Token is retrieved from server-side storage (database or environment variable)
- Returns 401 if not authenticated
- Validates token format before returning

### 2. Client-Side WebSocket Store
**File: `/src/lib/stores/websocket.svelte.ts`**
- Created a new Svelte 5 store for managing WebSocket connections
- Features:
  - Fetches auth credentials from `/api/ws-auth` endpoint
  - Establishes and maintains WebSocket connection to Anova servers
  - Auto-reconnect with exponential backoff (max 5 attempts)
  - Handles device discovery messages
  - Handles device state update messages
  - Provides methods to send commands and request device states
  - Stores discovered devices and their states in reactive Maps

### 3. Updated Main Page Component
**File: `/src/routes/+page.svelte`**
- Removed server-side polling mechanism (was polling every 2 seconds)
- Added WebSocket connection on component mount
- Auto-disconnects WebSocket on component unmount
- Requests device state every 5 seconds (less frequent than before since WebSocket pushes updates)
- Combines server-loaded devices with WebSocket-discovered devices
- Displays real-time device state from WebSocket store
- Shows connection status and errors

### 4. Simplified Server Actions
**File: `/src/routes/+page.server.ts`**
- Removed `getDeviceState` action (no longer needed)
- Kept command-sending actions (startCook, stopCook, setProbe, setTemperatureUnit)
- Kept initial device discovery on page load

## Architecture

### Before
```
Client → Server → WebSocket (server-side) → Anova API
       ← Polling ←
```

### After
```
Client → WebSocket (client-side) → Anova API
       ← Real-time Updates ←

Client → /api/ws-auth → Server (auth token)
```

## Benefits

1. **Real-time Updates**: WebSocket connection maintained client-side provides instant state updates
2. **Reduced Server Load**: No more polling server every 2 seconds
3. **Better Performance**: Direct WebSocket connection is faster than HTTP polling
4. **Secure Authentication**: Token still managed server-side and only exposed through secure endpoint
5. **Auto-Reconnect**: Handles connection drops gracefully with exponential backoff
6. **Cleaner Architecture**: Separation of concerns - server handles auth, client handles real-time communication

## Connection Management

- **Connection**: Established when page component mounts
- **Disconnection**: Clean disconnect when page component unmounts
- **Reconnection**: Automatic with exponential backoff (3s, 4.5s, 6.75s, 10.1s, 15.2s delays)
- **Max Reconnect Attempts**: 5 attempts before giving up
- **State Requests**: Every 5 seconds to ensure fresh data (down from 2 seconds)

## WebSocket Store API

```typescript
wsStore.connect()           // Establish connection
wsStore.disconnect()        // Close connection
wsStore.sendCommand(cmd)    // Send a command
wsStore.requestDeviceState(deviceId)  // Request device state

// Reactive properties
$wsStore.connected          // Connection status
$wsStore.devices            // Map of discovered devices
$wsStore.deviceStates       // Map of device states
$wsStore.error              // Error message (if any)
```

## Backward Compatibility

- Server-side command sending still works (forms still use server actions)
- Initial device discovery still happens on server load
- Can optionally move command sending to client-side in the future

## Testing Recommendations

1. Test connection on page load
2. Test auto-reconnect by temporarily losing network connection
3. Test device state updates in real-time
4. Test error handling when token is not set
5. Test multiple devices if available

