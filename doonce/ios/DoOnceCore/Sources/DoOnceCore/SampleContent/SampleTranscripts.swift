import Foundation

/// Transcripts used by the seed and the mock transcription service.
public enum SampleTranscripts {
    /// Julien, the plumber, repressurising the Vaillant boiler on 18 March 2026. ~2 minutes.
    public static let boilerRepressurise = Transcript(
        segments: [
            timed(0.0, 5.6, "Right, so first find the filling loop, it's this bit here under the boiler with the two valves."),
            timed(5.6, 9.8, "You'll need to do this whenever the pressure drops below 1 bar, the gauge is up here."),
            timed(9.8, 14.0, "You can see it's sitting on 0.8 now, so it needs topping up."),
            timed(14.0, 19.5, "First, open this black valve on the left. Turn it a quarter turn until it stops."),
            timed(19.5, 26.0, "That one's fine to open fully, it just lets the water through to the loop."),
            timed(26.0, 35.0, "Now watch the gauge as we go. Nothing happens yet because the blue one is still closed."),
            timed(35.0, 41.0, "Now the blue valve. Turn the blue valve slowly. Really slowly, you'll hear the water going in."),
            timed(41.0, 48.5, "Never open it fast, you'll overshoot and then you have to bleed a radiator to bring it back down."),
            timed(48.5, 58.0, "Important, keep your other hand on the black valve so you can shut it quickly if you need to."),
            timed(58.0, 64.0, "Stop when the pressure reaches 1.5 bar. Keep watching the needle, that's the green zone."),
            timed(64.0, 72.0, "If it goes past 1.6 bar you've gone too far, so close it and go a bit lower next time."),
            timed(72.0, 86.0, "And you're not looking for exactly 1.5, anywhere between 1 and 1.5 is fine when the system's cold."),
            timed(86.0, 93.0, "Then close the blue valve first, and then the black one. Blue first, always."),
            timed(93.0, 101.0, "Check the gauge holds. If it drops again over the next few days, there's a leak somewhere and you give me a call."),
            timed(101.0, 110.0, "That's it. Takes 30 seconds once you've done it once."),
            timed(110.0, 118.0, "Oh, and remember, if the pressure keeps dropping every week, don't keep topping it up, that's a sign the expansion vessel's gone."),
        ],
        keyPhrases: ["Repressurise boiler", "filling loop", "1.5 bar", "blue valve", "expansion vessel"]
    )

    /// The moments the analysis found in the boiler recording: five changes of what Julien's hands were doing.
    public static let boilerRepressuriseAnalysis = Analysis(
        moments: [
            DetectedMoment(id: SampleIDs.uuid(0x0901), time: 0.0, kind: .actionDetected, confidence: 0.91, label: "Pointing at filling loop"),
            DetectedMoment(id: SampleIDs.uuid(0x0902), time: 14.0, kind: .actionDetected, confidence: 0.88, label: "Hand on black valve"),
            DetectedMoment(id: SampleIDs.uuid(0x0903), time: 35.0, kind: .userMarked, confidence: 1.0, label: "Remember this"),
            DetectedMoment(id: SampleIDs.uuid(0x0904), time: 58.0, kind: .actionDetected, confidence: 0.84, label: "Looking at gauge"),
            DetectedMoment(id: SampleIDs.uuid(0x0905), time: 86.0, kind: .actionDetected, confidence: 0.9, label: "Closing valves"),
        ],
        objects: [
            DetectedObject(label: "boiler", confidence: 0.97, firstSeenAt: 0, lastSeenAt: 118),
            DetectedObject(label: "pressure gauge", confidence: 0.89, firstSeenAt: 5, lastSeenAt: 101),
        ],
        riskFlags: [
            RiskFlag(level: .medium, reason: "Pressurised heating system", time: 5.6),
        ]
    )

    /// A segment whose words are spread evenly across its duration, the way a mock recogniser would time them.
    static func timed(_ start: TimeInterval, _ end: TimeInterval, _ text: String) -> TranscriptSegment {
        let words = text.split(separator: " ").map(String.init)
        guard !words.isEmpty else { return TranscriptSegment(start: start, end: end, text: text) }
        let slot = (end - start) / Double(words.count)
        let timings = words.enumerated().map { index, word in
            TranscriptWord(text: word, start: start + slot * Double(index), end: start + slot * Double(index + 1))
        }
        return TranscriptSegment(start: start, end: end, text: text, words: timings)
    }
}
