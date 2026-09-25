import Foundation

extension SampleMemories {
    /// One memory each on the thermostat, washing machine, router and car.
    public static let aroundTheHouse: [Memory] = [holidayMode, cleanWashingMachineFilter, resetRouter, topUpWasherFluid]

    public static let holidayMode = Memory(
        id: SampleIDs.holidayMode,
        householdID: SampleIDs.household,
        title: "Set holiday mode",
        summary: "Turn the heating down to eco while away.",
        objectID: SampleIDs.thermostat,
        spaceID: SampleIDs.kitchen,
        demonstratorID: SampleIDs.me,
        creatorID: SampleIDs.amine,
        createdAt: SampleDates.date(2025, 7, 20, 16, 30),
        duration: 35,
        riskLevel: .low,
        steps: [
            houseStep(9, 1, "Press the ring once to open the menu.", range: 0...10, transcript: "Press the ring, once, and the menu comes up."),
            houseStep(9, 2, "Turn to Eco and press to select.", range: 10...22, transcript: "Turn it round to the leaf, Eco, and press."),
            houseStep(9, 3, "Turn to Schedule and set it back for the day you return.", range: 22...35, transcript: "Then schedule, and tell it the day we're back so the house is warm."),
        ],
        tags: ["heating", "holiday"]
    )

    public static let cleanWashingMachineFilter = Memory(
        id: SampleIDs.cleanWashingMachineFilter,
        householdID: SampleIDs.household,
        title: "Clean the filter",
        summary: "Drain and clean the pump filter when the machine won't empty.",
        objectID: SampleIDs.washingMachine,
        spaceID: SampleIDs.utilityRoom,
        demonstratorID: SampleIDs.me,
        creatorID: SampleIDs.amine,
        createdAt: SampleDates.date(2025, 10, 8, 12, 0),
        duration: 120,
        riskLevel: .low,
        steps: [
            houseStep(10, 1, "Open the flap at the bottom right.", range: 0...15, transcript: "The little flap bottom right, push the top and it swings down."),
            houseStep(10, 2, "Put a towel and a shallow tray underneath.", range: 15...35, transcript: "Towel down, and the baking tray, because water will come out, quite a lot.",
                      warning: Warning(text: "Remember there will be water; keep the tray underneath.", severity: .low, trigger: "remember")),
            houseStep(10, 3, "Turn the filter cap anticlockwise slowly and let it drain.", range: 35...85, transcript: "Turn the cap slowly, let the water run into the tray, then all the way out."),
            houseStep(10, 4, "Rinse the filter, screw it back in and close the flap.", range: 85...120, transcript: "Rinse it under the tap, screw it back till it's tight, flap up."),
        ],
        tools: ["towel"],
        tags: ["laundry", "maintenance"]
    )

    /// Added by Alex.
    public static let resetRouter = Memory(
        id: SampleIDs.resetRouter,
        householdID: SampleIDs.household,
        title: "Reset router",
        summary: "What to do when the wifi drops: power cycle, then factory reset if it still fails.",
        objectID: SampleIDs.router,
        spaceID: SampleIDs.kitchen,
        demonstratorID: SampleIDs.alexPerson,
        creatorID: SampleIDs.alex,
        createdAt: SampleDates.date(2026, 6, 2, 20, 15),
        duration: 58,
        riskLevel: .low,
        steps: [
            houseStep(11, 1, "Unplug the power for thirty seconds.", range: 0...20, transcript: "Pull the power out the back, count to thirty."),
            houseStep(11, 2, "Plug it back in and wait for the ring to go white.", range: 20...45, transcript: "Plug it back in, the ring goes blue then white, that's about two minutes."),
            houseStep(11, 3, "If it's still red, hold the reset pin for ten seconds.", range: 45...58, transcript: "If it's red still, paperclip in the reset hole, ten seconds, and set it up again from the app."),
        ],
        tags: ["wifi", "internet"]
    )

    public static let topUpWasherFluid = Memory(
        id: SampleIDs.topUpWasherFluid,
        householdID: SampleIDs.household,
        title: "Top up washer fluid",
        summary: "Dad showed where the washer reservoir is.",
        objectID: SampleIDs.car,
        spaceID: SampleIDs.garage,
        demonstratorID: SampleIDs.dad,
        creatorID: SampleIDs.amine,
        createdAt: SampleDates.date(2025, 9, 14, 15, 45),
        duration: 50,
        riskLevel: .medium,
        steps: [
            houseStep(12, 1, "Open the bonnet with the lever under the dash.", range: 0...15, transcript: "Lever under the dash, left side, then the catch under the bonnet."),
            houseStep(12, 2, "Find the blue cap with the windscreen symbol.", range: 15...30, transcript: "Blue cap, windscreen symbol on it, on the right by the headlight. Careful, the engine's hot if you've just driven.",
                      warning: Warning(text: "Careful, the engine's hot if you've just driven.", severity: .medium, trigger: "careful")),
            houseStep(12, 3, "Pour in fluid until you can see it in the neck.", range: 30...50, transcript: "Pour it in till you see it in the neck, cap back on, done."),
        ],
        tags: ["car", "maintenance"]
    )

    // MARK: Helpers

    private static func houseStep(
        _ memoryNumber: Int,
        _ order: Int,
        _ instruction: String,
        range: ClosedRange<TimeInterval>,
        transcript: String,
        warning: Warning? = nil
    ) -> Step {
        Step(
            id: SampleIDs.step(memory: memoryNumber, order: order),
            order: order,
            instruction: instruction,
            sourceRange: range,
            sourceTranscript: transcript,
            warning: warning,
            provenance: .observed,
            completionRule: .manual
        )
    }
}
