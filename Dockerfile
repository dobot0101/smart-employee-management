FROM node:22

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# CMD ["npm", "run", "dev"] 
CMD ["npm", "run", "debug"] 