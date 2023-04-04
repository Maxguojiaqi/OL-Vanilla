FROM node:latest 
EXPOSE 3000
# run and upadte the package tini
RUN apk add -update tini
# create the parent folder along with child folder 
RUN mkdir -p /usr/src/app
WORKDIR /sur/src/app
COPY package.json package.json
RUN npm install && npm cache clean
# copy everything from my current host to the docker directory
COPY . .
#
CMD []