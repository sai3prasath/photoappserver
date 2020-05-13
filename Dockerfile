
FROM node:8.11.1

WORKDIR /app
COPY . /app


RUN npm install 
CMD node index.js
EXPOSE 9001