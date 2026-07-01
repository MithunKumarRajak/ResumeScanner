FROM node:20-slim

WORKDIR /frontend

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

EXPOSE 5173

# Run Vite dev server accessible from outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
