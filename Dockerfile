################################################################
##                   Copyright (c) MidSpike                   ##
################################################################

# https://docs.docker.com/engine/reference/builder/

################################################################

# Create a stage for installing system dependencies.
FROM rust:1.96.1-slim-trixie AS system

# Set the working directory.
WORKDIR /app

# Install required system dependencies.
RUN apt-get update -y && \
    apt-get install -y pkg-config libssl-dev cmake ca-certificates chromium --fix-missing

################################################################

# Create a new stage for building the dependencies.
FROM system AS dependencies

# Set the working directory.
WORKDIR /app

# Copy _docker_cache.rs
COPY src/_docker_cache.rs ./src/_docker_cache.rs

# Copy the dependency files
COPY Cargo.toml Cargo.lock ./

# Build the dependencies
RUN cargo build --locked --release --bin docker-cache

################################################################

# Create a new stage for building the application.
FROM dependencies AS builder

# Set the working directory.
WORKDIR /app

# Copy the source code
COPY src/ ./src/

# Build the application
RUN cargo build --locked --release --bin iris-utilities

################################################################

# Create a new stage for running the application.
FROM builder AS runtime

# Set the working directory
WORKDIR /app

# Copy the compiled binary from the builder stage
COPY --from=builder /app/target/release/iris-utilities /bin/iris-utilities

# Create the non-root user
RUN adduser --disabled-password app

# Switch to the non-root user
USER app

# Run the application
CMD ["/bin/iris-utilities"]
