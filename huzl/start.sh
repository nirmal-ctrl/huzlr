#!/bin/bash
set -e

echo "Starting PulseAudio daemon..."
# Start PulseAudio in the background
pulseaudio -D --exit-idle-time=-1 --system=false --disallow-exit --disallow-module-loading=no --fail=no

sleep 2

echo "Configuring huzlr virtual speaker and virtual microphone..."
sink_exists() {
    pactl list sinks short | awk '{print $2}' | grep -Fxq "$1"
}

source_exists() {
    pactl list sources short | awk '{print $2}' | grep -Fxq "$1"
}

if ! sink_exists huzlr_Speaker; then
    pactl load-module module-null-sink sink_name=huzlr_Speaker sink_properties=device.description="huzlr_Virtual_Speaker"
fi

if ! sink_exists huzlr_Mic; then
    pactl load-module module-null-sink sink_name=huzlr_Mic sink_properties=device.description="huzlr_Virtual_Microphone"
fi

sink_exists huzlr_Speaker || { echo "Required virtual speaker was not created" >&2; exit 1; }
sink_exists huzlr_Mic || { echo "Required virtual microphone sink was not created" >&2; exit 1; }
source_exists huzlr_Mic.monitor || { echo "Required virtual microphone source was not created" >&2; exit 1; }

# Set default sink and source in PulseAudio so Chromium and other apps route correctly
echo "Setting default PulseAudio sink and source..."
pactl set-default-sink huzlr_Speaker
pactl set-default-source huzlr_Mic.monitor

echo "Listing virtual audio hardware devices inside the container:"
pactl list sources short
pactl list sinks short

# Configure ALSA to expose PulseAudio sinks/sources as ALSA devices
echo "Configuring ALSA virtual devices..."
cat <<EOF > /etc/asound.conf
pcm.!default {
    type pulse
}
ctl.!default {
    type pulse
}

pcm.huzlr_Virtual_Speaker {
    type pulse
    device huzlr_Speaker.monitor
}
ctl.huzlr_Virtual_Speaker {
    type pulse
    device huzlr_Speaker.monitor
}

pcm.huzlr_Virtual_Microphone {
    type pulse
    device huzlr_Mic
}
ctl.huzlr_Virtual_Microphone {
    type pulse
    device huzlr_Mic
}
EOF

echo "huzlr Google Meet Bridge container is fully prepared."
echo "Executing your main application..."

# Start a default shell session or run your app command passed down
if [ -z "$1" ]; then
    echo "No application started. Defaulting to Python shell."
    exec python3
else
    exec "$@"
fi
