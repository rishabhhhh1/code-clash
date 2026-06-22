FROM ubuntu:22.04

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install compilers and runtimes
RUN apt-get update && apt-get install -y \
    g++ \
    default-jdk \
    python3 \
    python3-pip \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd -m -s /bin/bash judge

# Set working directory
WORKDIR /home/judge

# Create a simple entrypoint script
COPY --chown=judge:judge judge-runner.sh /home/judge/judge-runner.sh
RUN chmod +x /home/judge/judge-runner.sh

USER judge

ENTRYPOINT ["/home/judge/judge-runner.sh"]
