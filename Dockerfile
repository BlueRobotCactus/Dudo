# Use Node 18 (LTS) as the base
FROM node:18

# 1) Set the working directory for our backend
WORKDIR /usr/src/app

# 2) Copy backend package.json and lock file, then install
COPY package*.json ./
RUN npm install

# 3) Copy over our backend code (including server.js)
COPY server.js ./

# 4) Build the React app (client)
#    - Step into /usr/src/app/client
WORKDIR /usr/src/app/client
COPY client/package*.json ./
RUN npm install

# Copy the rest of the React client code
COPY client/ ./

# Run the React build process
RUN npm run build

# 5) Move the built React files into the /usr/src/app/build folder
WORKDIR /usr/src/app
RUN mkdir build && cp -r /usr/src/app/client/build/* build

# 6) Expose the port & start the server
EXPOSE 8080
CMD ["node", "server.js"]
