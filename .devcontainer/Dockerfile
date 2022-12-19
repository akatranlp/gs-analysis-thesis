FROM mcr.microsoft.com/devcontainers/typescript-node:0-18

RUN apt update \
&& apt install -y git

RUN su node -c "mkdir /home/node/.ssh && npm install -g typescript"
