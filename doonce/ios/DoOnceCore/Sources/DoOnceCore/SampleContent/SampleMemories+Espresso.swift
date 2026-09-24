import Foundation

extension SampleMemories {
    /// Five memories on the La Marzocco Linea Mini.
    public static let espressoMachine: [Memory] = [cleanGroupHead, dadsSettings, cleanEspressoMachine, backflush, changeWaterFilter]

    public static let cleanGroupHead = Memory(
        id: SampleIDs.cleanGroupHead,
        householdID: SampleIDs.household,
        title: "Clean group head",
        summary: "Daily rinse and brush of the group head and gasket.",
        objectID: SampleIDs.espressoMachine,
        spaceID: SampleIDs.kitchen,
        demonstratorID: SampleIDs.me,
        creatorID: SampleIDs.amine,
        createdAt: SampleDates.date(2026, 2, 2, 8, 15),
        duration: 74,
        riskLevel: .medium,
        steps: [
            espressoStep(4, 1, "Remove the portafilter and knock out the puck.", range: 0...12,
                         transcript: "Take the portafilter out and knock the puck out into the bin."),
            espressoStep(4, 2, "Run water through the group for five seconds.", range: 12...28,
                         transcript: "Run the group for about five seconds to flush the old coffee off the screen. Careful, it's hot.",
                         warning: Warning(text: "Careful, it's hot.", severity: .medium, trigger: "careful")),
            espressoStep(4, 3, "Brush the gasket and shower screen.", range: 28...55,
                         transcript: "Then the brush, go round the gasket and across the screen, get the grounds out of the groove."),
            espressoStep(4, 4, "Wipe the portafilter and lock it back in.", range: 55...74,
                         transcript: "Wipe the basket dry with the cloth and lock it back in so it stays warm."),
        ],
        tools: ["brush", "cloth"],
        tags: ["coffee", "daily"]
    )

    /// Dad, Christmas Eve 2025. The settings he dialled in.
    public static let dadsSettings = Memory(
        id: SampleIDs.dadsSettings,
        householdID: SampleIDs.household,
        title: "Dad's settings",
        summary: "How Dad set up the machine for the beans from Rue Mouffetard.",
        objectID: SampleIDs.espressoMachine,
        spaceID: SampleIDs.kitchen,
        demonstratorID: SampleIDs.dad,
        creatorID: SampleIDs.amine,
        createdAt: SampleDates.date(2025, 12, 24, 9, 30),
        duration: 96,
        riskLevel: .low,
        steps: [
            espressoStep(5, 1, "Set the brew temperature to 93 degrees.", range: 0...20,
                         transcript: "Right, temperature. Set it to 93 degrees, not 94, 93."),
            espressoStep(5, 2, "Dose 18 grams into the basket.", range: 20...42,
                         transcript: "Eighteen grams in the basket. Weigh it, don't guess, always weigh it.",
                         warning: Warning(text: "Weigh it, don't guess, always weigh it.", severity: .low, trigger: "always")),
            espressoStep(5, 3, "Grind finer until the shot runs 28 seconds.", range: 42...75,
                         transcript: "Then adjust the grind. You want the shot to run about 28 seconds for 36 grams out. If it's faster, go finer."),
            espressoStep(5, 4, "Pre-infuse for three seconds, then full pressure.", range: 75...96,
                         transcript: "Lift the paddle halfway for three seconds, then all the way. That's the whole trick."),
        ],
        tags: ["coffee", "recipe"]
    )

    /// In progress: 2 of 7 steps done. See `SampleData.espressoProgress`.
    public static let cleanEspressoMachine = Memory(
        id: SampleIDs.cleanEspressoMachine,
        householdID: SampleIDs.household,
        title: "Clean espresso machine",
        summary: "The weekly deep clean: backflush with detergent, soak the parts, wipe down.",
        objectID: SampleIDs.espressoMachine,
        spaceID: SampleIDs.kitchen,
        demonstratorID: SampleIDs.me,
        creatorID: SampleIDs.amine,
        createdAt: SampleDates.date(2026, 1, 5, 17, 0),
        duration: 240,
        riskLevel: .medium,
        steps: [
            espressoStep(6, 1, "Switch the machine off and let it cool for ten minutes.", range: 0...15,
                         transcript: "Switch it off first and give it ten minutes, the steam wand is hot."),
            espressoStep(6, 2, "Remove the drip tray and empty it.", range: 15...40,
                         transcript: "Pull the tray out, empty it in the sink."),
            espressoStep(6, 3, "Put the blind filter in with half a teaspoon of cleaning powder.", range: 40...70,
                         transcript: "Blind basket, half a teaspoon of the Cafiza in."),
            espressoStep(6, 4, "Backflush five times, ten seconds on, ten off.", range: 70...130,
                         transcript: "Lock it in, run it ten seconds, stop, ten seconds, five times."),
            espressoStep(6, 5, "Rinse the blind filter and backflush five more times with clean water.", range: 130...180,
                         transcript: "Rinse the basket, then same again with no powder so there's nothing left in the group."),
            espressoStep(6, 6, "Soak the portafilter and baskets in cleaner for twenty minutes.", range: 180...210,
                         transcript: "Everything in a jug with a teaspoon of powder, twenty minutes."),
            espressoStep(6, 7, "Wipe the steam wand and the body, and put the tray back.", range: 210...240,
                         transcript: "Wipe the wand with the damp cloth, wipe the sides, tray back in. Done."),
        ],
        tools: ["blind filter", "cloth"],
        tags: ["coffee", "weekly"]
    )

    public static let backflush = Memory(
        id: SampleIDs.backflush,
        householdID: SampleIDs.household,
        title: "Backflush",
        summary: "Quick water-only backflush after the last coffee of the day.",
        objectID: SampleIDs.espressoMachine,
        spaceID: SampleIDs.kitchen,
        demonstratorID: SampleIDs.me,
        creatorID: SampleIDs.amine,
        createdAt: SampleDates.date(2026, 1, 15, 21, 10),
        duration: 40,
        riskLevel: .low,
        steps: [
            espressoStep(7, 1, "Put the blind filter in the portafilter.", range: 0...10, transcript: "Blind basket in."),
            espressoStep(7, 2, "Lock it in and run the pump for ten seconds.", range: 10...25, transcript: "Lock it in, run it for ten seconds."),
            espressoStep(7, 3, "Release and repeat three times.", range: 25...40, transcript: "Release, you hear the whoosh, and do that three times."),
        ],
        tools: ["blind filter"],
        tags: ["coffee", "daily"]
    )

    public static let changeWaterFilter = Memory(
        id: SampleIDs.changeWaterFilter,
        householdID: SampleIDs.household,
        title: "Change the water filter",
        summary: "Swap the in-tank filter cartridge every two months.",
        objectID: SampleIDs.espressoMachine,
        spaceID: SampleIDs.kitchen,
        demonstratorID: SampleIDs.me,
        creatorID: SampleIDs.amine,
        createdAt: SampleDates.date(2025, 9, 3, 11, 0),
        duration: 88,
        riskLevel: .low,
        steps: [
            espressoStep(8, 1, "Lift the tank out from behind the machine.", range: 0...20, transcript: "Lift the tank out, it's behind, pull it straight up."),
            espressoStep(8, 2, "Twist the old cartridge off the hose.", range: 20...40, transcript: "Twist the cartridge, it just pops off the hose."),
            espressoStep(8, 3, "Soak the new cartridge for five minutes, then fit it.", range: 40...70, transcript: "New one soaks in a glass for five minutes, then push it on the hose till it clicks."),
            espressoStep(8, 4, "Refill the tank and run two flushes.", range: 70...88, transcript: "Fill it, tank back in, run the group twice to get the air out."),
        ],
        tags: ["coffee", "maintenance"]
    )

    // MARK: Helpers

    private static func espressoStep(
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
