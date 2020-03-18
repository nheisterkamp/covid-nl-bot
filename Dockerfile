FROM node:alpine
RUN mkdir -p /app
WORKDIR /app
ADD package.json yarn.lock ./
RUN yarn
ADD . .
CMD ["node", "src"]