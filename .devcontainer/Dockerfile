FROM mcr.microsoft.com/devcontainers/typescript-node:0-18

RUN apt update \
&& apt install -y git \
&& curl -sSL https://get.docker.com/ | sh

RUN su node -c "mkdir /home/node/.ssh && npm install -g typescript turbo"
