
# Local development set up
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci  # clean install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


# For production this set up is recommended
#FROM node:22-alpine AS build
#
#WORKDIR /app
#
#COPY package*.json ./
#
#RUN npm ci
#
#COPY . .
#
#RUN npm run build
#
#FROM nginx:alpine
#
#COPY --from=build /app/dist /usr/share/nginx/html
#
#EXPOSE 80
#
#CMD ["nginx", "-g", "daemon off;"]
#
#EXPOSE 5173
#
#CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
