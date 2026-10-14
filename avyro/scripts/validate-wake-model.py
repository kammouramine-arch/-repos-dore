"""Run the actual bundled ONNX wake model locally; never upload audio."""
import argparse
import json
from pathlib import Path

import numpy as np
import sherpa_onnx
import soundfile as sf

parser = argparse.ArgumentParser()
parser.add_argument('--fixtures', type=Path, required=True)
parser.add_argument('--report', type=Path, required=True)
args = parser.parse_args()
models = Path(__file__).resolve().parent.parent / 'modules/avyro-wake/ios/models'
spotter = sherpa_onnx.KeywordSpotter(
    tokens=str(models / 'tokens.txt'), encoder=str(models / 'encoder.onnx'),
    decoder=str(models / 'decoder.onnx'), joiner=str(models / 'joiner.onnx'),
    keywords_file=str(models / 'keywords.txt'), num_threads=1,
    max_active_paths=8, keywords_score=1.5, keywords_threshold=0.1,
    num_trailing_blanks=1,
)
results = []
for path in sorted(args.fixtures.glob('*.wav')):
    audio, rate = sf.read(path, dtype='float32')
    if audio.ndim != 1:
        raise ValueError('Fixtures must be mono')
    for added_noise in (False, True):
        samples = audio.copy()
        if added_noise:
            samples += np.random.default_rng(7).normal(0, 0.025, samples.shape).astype(np.float32)
        samples = np.concatenate([samples, np.zeros(rate, dtype=np.float32)])
        stream = spotter.create_stream()
        detections = []
        for start in range(0, len(samples), 1600):
            stream.accept_waveform(rate, samples[start:start + 1600])
            while spotter.is_ready(stream):
                spotter.decode_stream(stream)
                result = spotter.keyword_spotter.get_result(stream)
                if result.keyword:
                    detections.append({'keyword': result.keyword, 'timestamps': list(result.timestamps)})
                    spotter.reset_stream(stream)
        results.append({'fixture': path.stem, 'addedNoise': added_noise,
                        'expectedWake': not path.stem.endswith('-control'), 'detections': detections})
summary = {
    'wakeDetected': sum(bool(r['detections']) for r in results if r['expectedWake']),
    'wakeTotal': sum(r['expectedWake'] for r in results),
    'falseWake': sum(bool(r['detections']) for r in results if not r['expectedWake']),
    'controlTotal': sum(not r['expectedWake'] for r in results),
}
args.report.parent.mkdir(parents=True, exist_ok=True)
args.report.write_text(json.dumps({'summary': summary, 'results': results}, indent=2), encoding='utf-8')
print(json.dumps(summary))
if not summary['wakeTotal'] or not summary['controlTotal'] or summary['falseWake'] or summary['wakeDetected'] / summary['wakeTotal'] < 0.95:
    raise SystemExit('Synthetic fixture gate failed; this does not measure physical driving accuracy.')
