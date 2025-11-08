import Database from 'better-sqlite3';
import { building } from '$app/environment';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import type { DeviceInfo } from './anova';

// Server-only database module
// This file should only be imported in server-side code

let db: Database.Database | null = null;

function getDatabase(): Database.Database {
	if (db) return db;

	const dbPath = process.env.DATABASE_PATH || './data/anova.db';
	
	// Create directory if it doesn't exist
	try {
		const dir = dirname(dbPath);
		mkdirSync(dir, { recursive: true });
	} catch (error) {
		// Directory might already exist, ignore error
	}

	// better-sqlite3 will create the database file automatically if it doesn't exist
	db = new Database(dbPath);

	// Enable WAL mode for better concurrency
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');

	// Create tokens table if it doesn't exist
	db.exec(`
		CREATE TABLE IF NOT EXISTS tokens (
			id TEXT PRIMARY KEY DEFAULT 'default',
			token TEXT NOT NULL,
			updated_at INTEGER NOT NULL DEFAULT (unixepoch())
		)
	`);

	// Create devices table if it doesn't exist
	db.exec(`
		CREATE TABLE IF NOT EXISTS devices (
			cookerId TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			pairedAt TEXT NOT NULL,
			type TEXT NOT NULL CHECK(type IN ('oven_v1', 'oven_v2')),
			updated_at INTEGER NOT NULL DEFAULT (unixepoch())
		)
	`);

	return db;
}

/**
 * Get the token from environment variable or database.
 * Environment variable takes precedence over database.
 * @returns The token string or null if not found
 */
export function getToken(): string | null {
	// Check environment variable first
	const envToken = process.env.ANOVA_TOKEN || process.env.ANOVA_PERSONAL_ACCESS_TOKEN;
	if (envToken) {
		return envToken;
	}

	// Fall back to database
	const database = getDatabase();
	const row = database.prepare('SELECT token FROM tokens WHERE id = ?').get('default') as
		| { token: string }
		| undefined;
	return row?.token || null;
}

/**
 * Check if token is coming from environment variable
 * @returns true if token is from environment variable, false otherwise
 */
export function isTokenFromEnv(): boolean {
	return !!(process.env.ANOVA_TOKEN || process.env.ANOVA_PERSONAL_ACCESS_TOKEN);
}

/**
 * Set the token in the database.
 * Note: If token is set via environment variable, this will not override it.
 * @param token The token to save
 */
export function setToken(token: string): void {
	const database = getDatabase();
	database
		.prepare('INSERT OR REPLACE INTO tokens (id, token, updated_at) VALUES (?, ?, unixepoch())')
		.run('default', token);
}

export function hasToken(): boolean {
	return getToken() !== null;
}



export function saveDevice(device: DeviceInfo): void {
	const database = getDatabase();
	database
		.prepare(
			'INSERT OR REPLACE INTO devices (cookerId, name, pairedAt, type, updated_at) VALUES (?, ?, ?, ?, unixepoch())'
		)
		.run(device.cookerId, device.name, device.pairedAt, device.type);
}

export function saveDevices(devices: DeviceInfo[]): void {
	const database = getDatabase();
	const stmt = database.prepare(
		'INSERT OR REPLACE INTO devices (cookerId, name, pairedAt, type, updated_at) VALUES (?, ?, ?, ?, unixepoch())'
	);
	const transaction = database.transaction((devices: DeviceInfo[]) => {
		for (const device of devices) {
			stmt.run(device.cookerId, device.name, device.pairedAt, device.type);
		}
	});
	transaction(devices);
}

export function getDevices(): DeviceInfo[] {
	const database = getDatabase();
	const rows = database
		.prepare('SELECT cookerId, name, pairedAt, type FROM devices ORDER BY updated_at DESC')
		.all() as Array<{
		cookerId: string;
		name: string;
		pairedAt: string;
		type: string;
	}>;
	return rows.map((row) => ({
		cookerId: row.cookerId,
		name: row.name,
		pairedAt: row.pairedAt,
		type: row.type === 'oven_v1' ? 'oven_v1' : 'oven_v2'
	}));
}

// Cleanup on process exit
if (!building) {
	process.on('exit', () => {
		if (db) {
			db.close();
		}
	});
}

