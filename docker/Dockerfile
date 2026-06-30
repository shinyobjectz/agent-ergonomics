# PI micro-VM for AX trials. Smallest practical sandbox: node-slim + PI.
# Build:  docker build -t agent-ergonomics/pi:latest docker/
# Use:    OOTA_SANDBOX=docker ax deep oota:<tool>
FROM node:22-slim
RUN npm install -g --ignore-scripts @earendil-works/pi-coding-agent && \
    useradd -m agent
USER agent
WORKDIR /work
ENTRYPOINT []
