#!/bin/bash

# Switch working directory to this file's directory
cd "$(dirname "$0")"

# Start everything
docker compose up --build

# Wait for user input to exit
read -p "Press any key to continue... " -n1 -s
