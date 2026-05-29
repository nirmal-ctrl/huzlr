# Use the official Microsoft Playwright image with jammy pre-installed
FROM mcr.microsoft.com/playwright:v1.45.0-jammy

# Set up environment variables
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies including Python, PulseAudio, PortAudio, and ALSA utils
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-dev \
    pulseaudio \
    pulseaudio-utils \
    alsa-utils \
    libasound2 \
    libasound2-dev \
    libportaudio2 \
    portaudio19-dev \
    && rm -rf /var/lib/apt/lists/*

# Set up the working directory inside the container
WORKDIR /app

# Copy the requirements file and install python packages
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Ensure playwright dependencies are configured
RUN playwright install chromium

# Copy the rest of the app source code
COPY . .

# Copy and configure the startup script
RUN chmod +x start.sh

# Expose WebRTC / Socket ports if any
EXPOSE 8080

# Run the startup script
ENTRYPOINT ["./start.sh"]
