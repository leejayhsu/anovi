- use conventional commits for commit messages and PR titles.
- use modern version of docker compose syntax: i.e. `docker compose up` instead of `docker-compose up`

# Anova specific notes
## Commands
- Timer values are in seconds
- Temperature values should include both Celsius and Fahrenheit for Oven v1 compatibility, but Fahrenheit is optional for Oven v2
- Device ID is obtained from WebSocket connection messages
- personally, we have a v1 oven, so we should consider dropping v2 support eventually.
