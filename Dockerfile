# Use official Node.js image with npm
FROM node:20-bullseye-slim

# Install runtime and build tools
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 python3-pip python3-venv \
      openjdk-17-jdk-headless \
      gcc g++ make curl unzip \
      git && \
    rm -rf /var/lib/apt/lists/*

# Add java to PATH explicitly
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="$JAVA_HOME/bin:$PATH"

# Create app directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy app source
COPY . ./

# Expose the port
EXPOSE 4000

# Default command
CMD ["node", "server.js"]
