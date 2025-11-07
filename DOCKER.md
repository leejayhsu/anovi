# Docker Setup for Anova Oven Remote Control

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

### Using Docker directly

```bash
# Build the image
docker build -t anova-oven-control .

# Run the container with data directory bind mount
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --name anova-oven \
  anova-oven-control
```

### Using Published Image from GitHub Container Registry

The Docker image is automatically built and published to GitHub Container Registry on every push to the main branch.

```bash
# Pull the latest image
docker pull ghcr.io/YOUR_USERNAME/anovi:latest

# Run the container
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --name anova-oven \
  ghcr.io/YOUR_USERNAME/anovi:latest
```

**Note:** Replace `YOUR_USERNAME` with your GitHub username or organization name. If the repository is private, you'll need to authenticate:

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Then pull and run as above
```

## Important Notes

### Database Persistence

✅ **YES, bind mount the `data` directory!** This ensures:
- Database persists across container restarts
- Database survives container deletion
- You can backup/access the database from the host
- Database is stored at `./data/anova.db` on your host

### Database Creation

✅ **YES, the database will be created automatically** in the container, just like locally. The code handles:
- Creating the `data/` directory if it doesn't exist
- Creating the database file automatically
- Creating the table structure on first run

### Volume Mount

The `docker-compose.yml` includes:
```yaml
volumes:
  - ./data:/app/data
```

This maps your host's `./data` directory to the container's `/app/data` directory.

### Environment Variables

You can override the database path or WebSocket URL:
```yaml
environment:
  DATABASE_PATH: /app/data/anova.db
  ANOVA_WS_URL: wss://devices.anovaculinary.io
```

### Adapter Note

For production Docker deployments, you may want to switch from `adapter-auto` to `adapter-node` in `svelte.config.js`:

```bash
npm install @sveltejs/adapter-node
```

Then update `svelte.config.js`:
```js
import adapter from '@sveltejs/adapter-node';
```

## Troubleshooting

- **Database not persisting?** Check that the volume mount is correct in docker-compose.yml
- **Permission errors?** The container runs as root by default. You may need to adjust permissions on the host `data/` directory
- **Build fails?** Make sure build dependencies (python3, make, g++) are installed (already in Dockerfile)

