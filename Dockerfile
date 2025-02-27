FROM node:20.12.2

WORKDIR /app

COPY . /app

RUN npm ci --legacy-peer-deps

RUN npm run build

CMD ["npm" , "run" , "start:prod"]
