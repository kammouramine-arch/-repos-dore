# meepmeep foreground keyword model

Weights: pkufool / icefall-kws-zipformer-zh-en-3M-2025-12-20, epoch-13-avg-2, chunk-16-left-64, original fp32 ONNX. Engine and weights are separately Apache-2.0; retain bundled Apache licence.

Original model declaration retrieved 2026-10-16:
https://www.modelscope.cn/models/pkufool/icefall-kws-zipformer-zh-en-3M-2025-12-20
https://github.com/k2-fsa/sherpa-onnx/issues/3802 (author confirms licence updated)
Official download: https://github.com/k2-fsa/sherpa-onnx/releases/download/kws-models/sherpa-onnx-kws-zipformer-zh-en-3M-2025-12-20.tar.bz2

No lexicon is redistributed. Custom keyword phones encode /hey meep meep/ with stress variants; this is open-vocabulary keyword configuration, not a newly trained model. The English wake phrase is used for both French and English commands. French wake pronunciation and other languages are not validated.

Operating point: one thread, 64 active paths, score 1.5, threshold 0.001, one trailing blank. Wider search adds CPU cost; iPhone sustained battery/thermal validation is required. Local synthetic tests passed 24/24 wake, 0/40 controls; harder set 16/16 wake, 0/48 controls. These are NOT independent human/car-noise benchmarks, and do not establish a real-world false-positive rate. Threshold must be re-evaluated on physical recordings before production.

Previous 2024 BPE model failed the new phrase (1/24 at baseline); the new model was selected after actual inference tests, not transcript rewriting.

## Integrity
- encoder.onnx: SHA-256 `540ff509ed89bd22afe04bf7049a54bb1c95c6d8a18742ea9691910cdb5f859e`
- decoder.onnx: SHA-256 `63a22dd60f40fff082ac3e09afa507f6787da36df76ded2fbe145fa233e22c21`
- joiner.onnx: SHA-256 `76f7a24ed0c08633af14b2ee377f747af880d3b65eeba2cd3f31f3380fb73e8d`
- tokens.txt: SHA-256 `2d3f32311f9b692b964da3c90e830258d3e78e013cb0c992dbfb15cd5a1a71b0`
- keywords.txt: SHA-256 `75cc6a3f70950bf86a1b51656a3bc64f08895e6e7bb6d1d123754b9f55684209`
