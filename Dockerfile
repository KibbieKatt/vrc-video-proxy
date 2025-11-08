# Use the official Node.js image
FROM node:22

# Install python for yt-dlp
RUN apt-get update \
  && apt-get install -y python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
