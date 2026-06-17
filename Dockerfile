FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 4201

CMD ["npm", "start", "--", "--host", "0.0.0.0", "--port", "4204"]