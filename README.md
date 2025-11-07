# Anova Oven Remote Control

A web application for remotely controlling Anova Precision Ovens via their WebSocket API.

## Features

- Remote control of Anova Precision Ovens (v1 and v2)
- Device discovery and management
- Start/stop cooking sessions
- Configure temperature, steam, and other cooking parameters
- Set probe temperature targets

## Configuration

### Personal Access Token

The application requires an Anova personal access token to authenticate with the Anova API. You can configure the token in two ways:

#### Option 1: Environment Variable (Recommended for Production)

Set one of the following environment variables:

```bash
export ANOVA_TOKEN="anova-your-token-here"
# or
export ANOVA_PERSONAL_ACCESS_TOKEN="anova-your-token-here"
```

The environment variable takes precedence over database storage. If set, the token form in the settings page will be disabled.

#### Option 2: Database Storage (Default)

If no environment variable is set, you can configure the token through the web interface:

1. Navigate to the Settings page
2. Enter your Anova personal access token
3. Click "Save Token"

The token will be stored in a local SQLite database.

## Development

Once you've created a project and installed dependencies with `npm install`, start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

## Environment Variables

- `ANOVA_TOKEN` or `ANOVA_PERSONAL_ACCESS_TOKEN` - Anova personal access token (optional, can be set via UI)
- `DATABASE_PATH` - Path to SQLite database file (default: `./data/anova.db`)

## Database

The application uses SQLite to store:
- Personal access tokens (if not using environment variable)
- Discovered device information

The database file is created automatically at the path specified by `DATABASE_PATH` (default: `./data/anova.db`).
