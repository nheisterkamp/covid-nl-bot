FROM node:alpine
ADD package.json yarn.lock ./
RUN yarn
ADD . .
CMD ["node", "src"]