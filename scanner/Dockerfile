FROM node:22-bookworm-slim

WORKDIR /app

# Install Playwright Chromium dependencies
RUN npx -y playwright install-deps chromium

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
COPY config/ ./config/
RUN npx playwright install chromium

CMD ["npm", "run", "scan:all"]
