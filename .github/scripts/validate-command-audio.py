"""Execute the production native encoder on real AVFoundation CAF recordings."""
from pathlib import Path
import subprocess
import tempfile

source = Path('avyro/modules/avyro-wake/ios/AvyroWakeModule.swift').read_text()
start = source.index('  private func commandAudioPayload() -> String? {')
end = source.index('  private func wakeError(', start)
production_function = source[start:end]
program = '''import Foundation
import AVFoundation
final class EncoderProbe {
  var commandURL: URL?
  func encode(_ url: URL) -> String? { commandURL = url; return commandAudioPayload() }
''' + production_function + '''
}
func verify(_ rate: Double, _ channels: AVAudioChannelCount, _ seconds: Double, _ expected: Bool) throws {
  let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".caf")
  defer { try? FileManager.default.removeItem(at: url) }
  let format = AVAudioFormat(standardFormatWithSampleRate: rate, channels: channels)!
  let count = Int(rate * seconds)
  let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(max(1,count)))!
  buffer.frameLength = AVAudioFrameCount(count)
  for channel in 0..<Int(channels) {
    for frame in 0..<count { buffer.floatChannelData![channel][frame] = Float(sin(Double(frame) * 2 * .pi * 440 / rate)) * 0.4 }
  }
  var file: AVAudioFile? = try AVAudioFile(forWriting: url, settings: format.settings)
  try file!.write(from: buffer); file = nil
  let result = EncoderProbe().encode(url)
  precondition((result != nil) == expected, "Unexpected encoder acceptance")
  guard expected, let encoded = result, let wav = Data(base64Encoded: encoded) else { return }
  func u32(_ offset: Int) -> UInt32 { wav[offset..<offset+4].enumerated().reduce(0) { $0 | (UInt32($1.element) << UInt32($1.offset * 8)) } }
  func u16(_ offset: Int) -> UInt16 { UInt16(wav[offset]) | (UInt16(wav[offset+1]) << 8) }
  precondition(String(data: wav[0..<4], encoding: .ascii) == "RIFF")
  precondition(String(data: wav[8..<16], encoding: .ascii) == "WAVEfmt ")
  precondition(u32(4) == UInt32(wav.count-8) && u32(16) == 16)
  precondition(u16(20) == 1 && u16(22) == 1 && u32(24) == 16000 && u32(28) == 32000 && u16(32) == 2 && u16(34) == 16)
  precondition(u32(40) == UInt32(wav.count-44))
  let frames = (wav.count-44)/2
  precondition(abs(Double(frames)/16000 - seconds) < 0.02, "Audio duration changed")
  var energy = 0.0
  for frame in 0..<frames { let sample = Double(Int16(bitPattern: u16(44+frame*2)))/32768; energy += sample*sample }
  precondition(sqrt(energy/Double(frames)) > 0.1, "Encoder lost the speech-band signal")
}
try verify(16000, 1, 1, true)
try verify(48000, 1, 3, true)
try verify(48000, 2, 3, true)
try verify(48000, 1, 0.05, false)
try verify(48000, 1, 21, false)
try verify(48000, 1, 0, false)
print("Native CAF-to-WAV encoding: six AVFoundation cases passed")
'''
with tempfile.TemporaryDirectory(prefix='avyro-audio-validation-') as temporary:
    folder = Path(temporary)
    swift = folder/'main.swift'
    swift.write_text(program)
    subprocess.run(['swiftc', '-O', str(swift), '-o', str(folder/'validate')], check=True)
    subprocess.run([str(folder/'validate')], check=True)
