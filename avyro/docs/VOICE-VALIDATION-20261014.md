# Foreground voice validation — October 14

The real bundled sherpa-onnx 1.13.8 ONNX model was run locally, outside the
mocked speech-port tests. No user recording was uploaded or used in this test.
The provided ABGK3225.MP4 was a JPEG thumbnail, not an audio/video recording.

The original keyword token spellings and score 5 missed six of eight synthetic
wake samples. Acoustic decoding showed different word boundaries and spellings
for the uncommon brand name. Added bounded phonetic aliases, an eight-path beam
and score 1.5 improved the measured fixture result; simply increasing the score
introduced false activations or further misses and was rejected.

Final fixture result: **23/24 positive trials**, **0/40 negative activations**.
Two installed Windows English voices generated the samples. The held-out phrases
used slower and faster speaking rates; trials included deterministic added noise.
These correlated synthetic samples are not a real-world accuracy estimate and
do not establish French pronunciation or in-car performance.

`scripts/validate-wake-model.py` executes the real model, writes a local report
and enforces this limited synthetic regression gate. Install its pinned local
requirements from `scripts/wake-validation-requirements.txt`; provide a fixture
directory and report path. Files ending `-control.wav` are negative examples.
No script sends audio to a service. Fixture generation used Windows System.Speech
Microsoft David/Zira voices and remains in the private test workspace; generated
voice assets are not distributed in the app.

Automatic foreground wake prefers the bundled licensed offline keyword model.
A bounded audio handoff starts at the keyword timestamp, excluding speech before
the wake phrase. French/English command recognition uses one active Apple speech
task at a time and replays the short temporary clip through the second locale.
The clip is deleted after completion, cancellation or backgrounding; crash leftovers
with the module's own filename prefix are removed on the next module creation.
No model-generated prose or raw recording reaches the AI gateway.

Physical acceptance remains: permission/readiness, English/French wake pronunciation,
same-breath addresses, Bluetooth routes, cabin noise, cancellation during recording
and recognition, interruptions and battery use. Keep Avyro foregrounded and test
voice while parked. No closed-app/Siri-equivalent listening is claimed.
