FROM node:8.11.1

# Install our run dependencies
RUN apt-get update \
  && apt-get install -y \
    libtool \
    pkg-config \
    build-essential \
    autoconf \
    automake \
    libzmq3-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/local/src

COPY package.json package-lock.json ./
RUN npm install

ADD . /usr/local/src

EXPOSE 3838
USER node

CMD ["./bin/entrypoint.sh"]
