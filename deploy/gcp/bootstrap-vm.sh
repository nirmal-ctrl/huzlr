#!/bin/bash

set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg htop

sudo install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
fi

architecture="$(dpkg --print-architecture)"
codename="$(. /etc/os-release && echo "$VERSION_CODENAME")"
echo \
    "deb [arch=$architecture signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $codename stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

sudo apt-get update
sudo apt-get install -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin

sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"

sudo install -d -m 0755 -o "$USER" -g "$USER" /opt/huzlr
sudo install -d -m 0700 -o "$USER" -g "$USER" /opt/huzlr-data/google-bot-profile
sudo install -d -m 0750 -o "$USER" -g "$USER" /opt/huzlr-data/debug

if ! sudo swapon --show=NAME --noheadings | grep -Fxq /swapfile; then
    if [ ! -f /swapfile ]; then
        sudo fallocate -l 4G /swapfile
        sudo chmod 0600 /swapfile
        sudo mkswap /swapfile
    fi
    sudo swapon /swapfile
fi

if ! grep -Fq '/swapfile none swap sw 0 0' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

docker --version
docker compose version
free -h
