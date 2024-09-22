# 1. Use an official Node.js runtime as the base image
FROM node:22

# 2. Set the working directory inside the container
WORKDIR /src

# 3. Copy the package.json and package-lock.json files
COPY package*.json ./

# 4. Install the necessary dependencies
RUN npm install

# 5. Copy the rest of the application source code into the container
COPY . .

# 6. Build the TypeScript files (compiling src to dist)
RUN npm run build

# 7. Specify the environment variable for the port your app will run on
ENV PORT 8000

# 8. Expose the port for the app to listen on
EXPOSE 8000

# 9. Command to run the application
CMD [ "node", "dist/index.js" ]
