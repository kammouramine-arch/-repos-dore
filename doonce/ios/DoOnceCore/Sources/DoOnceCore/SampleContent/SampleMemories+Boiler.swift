import Foundation

/// The memories in the seed, grouped by object.
public enum SampleMemories {
    /// Three memories on the Vaillant boiler: two from Julien's visit, one from Dad.
    public static let boiler: [Memory] = [repressuriseBoiler, restartBoiler, emergencyShutoff]

    /// Julien Martin, 18 March 2026. Every step has a source range into `SampleData.boilerRecording`.
    public static let repressuriseBoiler = Memory(
        id: SampleIDs.repressuriseBoiler,
        householdID: SampleIDs.household,
        title: "Repressurise boiler",
        summary: "Julien showed how to top the system back up to 1.5 bar using the filling loop.",
        objectID: SampleIDs.boiler,
        spaceID: SampleIDs.utilityRoom,
        demonstratorID: SampleIDs.julien,
        creatorID: SampleIDs.amine,
        createdAt: SampleDates.date(2026, 3, 18, 14, 20),
        sourceRecordingID: SampleIDs.boilerRecording,
        duration: 118,
        riskLevel: .medium,
        steps: [
            boilerStep(1, "Find the filling loop under the boiler.",
                       details: "It's the short braided hose with two valves, right under the casing. Do this whenever the gauge drops below 1 bar.",
                       range: 0...14,
                       transcript: "Right, so first find the filling loop, it's this bit here under the boiler with the two valves. You'll need to do this whenever the pressure drops below 1 bar, the gauge is up here."),
            boilerStep(2, "Open the black valve on the left fully.",
                       details: "A quarter turn until it stops. This one only lets water through to the loop, so it's fine to open all the way.",
                       range: 14...35,
                       transcript: "First, open this black valve on the left. Turn it a quarter turn until it stops. That one's fine to open fully, it just lets the water through to the loop."),
            boilerStep(3, "Turn the blue valve slowly.",
                       details: "You'll hear the water going in. Keep your other hand on the black valve so you can shut it quickly.",
                       range: 35...58,
                       transcript: "Now the blue valve. Turn the blue valve slowly. Really slowly, you'll hear the water going in. Never open it fast, you'll overshoot and then you have to bleed a radiator to bring it back down.",
                       warning: Warning(text: "Never open it fast, you'll overshoot and then you have to bleed a radiator to bring it back down.", severity: .medium, trigger: "never")),
            boilerStep(4, "Stop when pressure reaches 1.5 bar.",
                       details: "Anywhere between 1 and 1.5 bar is fine when the system is cold. Past 1.6 bar is too far.",
                       range: 58...86,
                       transcript: "Stop when the pressure reaches 1.5 bar. Keep watching the needle, that's the green zone. If it goes past 1.6 bar you've gone too far, so close it and go a bit lower next time.",
                       completionRule: .gaugeReaches(value: 1.5, unit: "bar")),
            boilerStep(5, "Close the blue valve first, then the black one.",
                       details: "Check the gauge holds. If it keeps dropping every week, don't keep topping it up; the expansion vessel may have gone.",
                       range: 86...118,
                       transcript: "Then close the blue valve first, and then the black one. Blue first, always. Check the gauge holds. If it drops again over the next few days, there's a leak somewhere and you give me a call.",
                       warning: Warning(text: "Blue first, always.", severity: .medium, trigger: "always")),
        ],
        tools: [],
        warnings: [
            Warning(text: "Never open the blue valve fast; you'll overshoot.", severity: .medium, trigger: "never"),
        ],
        tags: ["heating", "pressure", "yearly"],
        lastConfirmedAt: SampleDates.date(2026, 9, 20)
    )

    /// Dad, 12 November 2025, when the boiler locked out during a cold snap.
    public static let restartBoiler = Memory(
        id: SampleIDs.restartBoiler,
        householdID: SampleIDs.household,
        title: "Restart boiler",
        summary: "Dad showed how to clear a lockout with the reset button.",
        objectID: SampleIDs.boiler,
        spaceID: SampleIDs.utilityRoom,
        demonstratorID: SampleIDs.dad,
        creatorID: SampleIDs.amine,
        createdAt: SampleDates.date(2025, 11, 12, 19, 5),
        duration: 46,
        riskLevel: .medium,
        steps: [
            Step(id: SampleIDs.step(memory: 2, order: 1), order: 1, instruction: "Check the display shows a fault code starting with F.",
                 details: "F.22 means low pressure; repressurise first if you see it.",
                 sourceRange: 0...12, sourceTranscript: "Look at the screen first. If it's an F code, F twenty-two, that's just the pressure, sort that first.", provenance: .observed, completionRule: .manual),
            Step(id: SampleIDs.step(memory: 2, order: 2), order: 2, instruction: "Hold the reset button for three seconds.",
                 details: "The flame symbol with the cross through it. Let go when the display blinks.",
                 sourceRange: 12...31, sourceTranscript: "Then hold this button, the one with the flame, hold it about three seconds till it blinks.", provenance: .observed, completionRule: .manual),
            Step(id: SampleIDs.step(memory: 2, order: 3), order: 3, instruction: "Wait for the flame symbol to come back on.",
                 details: "Takes about a minute. If it locks out twice in a row, stop and call Julien.",
                 sourceRange: 31...46, sourceTranscript: "Give it a minute and the flame should come back. If it does it twice, don't keep resetting it, ring the plumber.", provenance: .observed, completionRule: .manual),
        ],
        tags: ["heating", "winter"]
    )

    /// Julien Martin, 18 March 2026. High risk: gas and mains electricity.
    public static let emergencyShutoff = Memory(
        id: SampleIDs.emergencyShutoff,
        householdID: SampleIDs.household,
        title: "Emergency shutoff",
        summary: "How Julien said to turn off gas and power to the boiler if you smell gas.",
        objectID: SampleIDs.boiler,
        spaceID: SampleIDs.utilityRoom,
        demonstratorID: SampleIDs.julien,
        creatorID: SampleIDs.amine,
        createdAt: SampleDates.date(2026, 3, 18, 14, 41),
        duration: 52,
        riskLevel: .high,
        steps: [
            Step(id: SampleIDs.step(memory: 3, order: 1), order: 1, instruction: "Turn the gas off at the meter.",
                 details: "The yellow lever by the meter box. Across the pipe means off.",
                 sourceRange: 0...18, sourceTranscript: "If you ever smell gas, first thing, the yellow lever at the meter. Turn it so it's across the pipe, that's off.",
                 warning: Warning(text: "Never switch lights on or off if you smell gas.", severity: .high, trigger: "never"),
                 provenance: .observed, completionRule: .manual),
            Step(id: SampleIDs.step(memory: 3, order: 2), order: 2, instruction: "Switch the boiler off at the fused spur.",
                 details: "The switch with the red light, to the right of the boiler.",
                 sourceRange: 18...34, sourceTranscript: "Then the electric. That fused spur with the red light, flick it off so the boiler's dead.", provenance: .observed, completionRule: .manual),
            Step(id: SampleIDs.step(memory: 3, order: 3), order: 3, instruction: "Open the windows and call the gas emergency line.",
                 details: "Go outside to make the call. Don't go back in until they've been.",
                 sourceRange: 34...52, sourceTranscript: "Open a window, get outside and call the emergency number. Don't go back in until they say it's clear.", provenance: .observed, completionRule: .manual),
        ],
        warnings: [
            Warning(text: "Gas and mains electricity. Only for an emergency.", severity: .high),
        ],
        tags: ["safety", "gas"]
    )

    // MARK: Helpers

    private static func boilerStep(
        _ order: Int,
        _ instruction: String,
        details: String,
        range: ClosedRange<TimeInterval>,
        transcript: String,
        warning: Warning? = nil,
        completionRule: CompletionRule = .manual
    ) -> Step {
        Step(
            id: SampleIDs.step(memory: 1, order: order),
            order: order,
            instruction: instruction,
            details: details,
            sourceRange: range,
            sourceTranscript: transcript,
            keyFrame: SampleData.frame("boiler-repressurise", at: range.lowerBound + 2),
            clip: SampleData.clip("boiler-repressurise", range),
            warning: warning,
            provenance: .observed,
            completionRule: completionRule
        )
    }
}
