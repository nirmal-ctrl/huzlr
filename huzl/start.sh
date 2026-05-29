#!/bin/bash
set -e

echo "Starting PulseAudio daemon..."
# Start PulseAudio in the background
pulseaudio -D --exit-idle-time=-1 --system=false --disallow-exit --disallow-module-loading=no --fail=no

sleep 2

echo "Configuring Huzlr virtual speaker and virtual microphone..."
# Create virtual speaker
pactl load-module module-null-sink sink_name=Huzlr_Speaker sink_properties=device.description="Huzlr_Virtual_Speaker" || echo "Virtual Speaker already configured"

# Create virtual microphone
pactl load-module module-null-sink sink_name=Huzlr_Mic sink_properties=device.description="Huzlr_Virtual_Microphone" || echo "Virtual Microphone already configured"

# Set default sink and source in PulseAudio so Chromium and other apps route correctly
echo "Setting default PulseAudio sink and source..."
pactl set-default-sink Huzlr_Speaker || echo "Failed to set default sink"
pactl set-default-source Huzlr_Mic.monitor || echo "Failed to set default source"

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

pcm.Huzlr_Virtual_Speaker {
    type pulse
    device Huzlr_Speaker.monitor
}
ctl.Huzlr_Virtual_Speaker {
    type pulse
    device Huzlr_Speaker.monitor
}

pcm.Huzlr_Virtual_Microphone {
    type pulse
    device Huzlr_Mic
}
ctl.Huzlr_Virtual_Microphone {
    type pulse
    device Huzlr_Mic
}
EOF

echo "Huzlr Google Meet Bridge container is fully prepared."
echo "Executing your main application..."

# Start a default shell session or run your app command passed down
if [ -z "$1" ]; then
    echo "No application started. Defaulting to Python shell."
    exec python3
else
    exec "$@"
fi
