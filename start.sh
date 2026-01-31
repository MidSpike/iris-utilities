#!/bin/bash

# Switch working directory to this file's directory
cd "$(dirname "$0")"

# Start everything
docker compose --profile lavalink --profile libre-translate up --build

# Wait for user input to exit
read -p "Press any key to continue... " -n1 -s
