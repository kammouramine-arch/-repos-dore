import Foundation

/// Stable identifiers for sample content, so previews and tests can refer to the same records.
public enum SampleIDs {
    /// A readable, deterministic UUID: `SampleIDs.uuid(0x0101)` → `00000000-0000-4000-8000-000000000101`.
    public static func uuid(_ number: Int) -> UUID {
        let suffix = String(number, radix: 16).uppercased()
        let padded = String(repeating: "0", count: 12 - suffix.count) + suffix
        return UUID(uuidString: "00000000-0000-4000-8000-\(padded)")!
    }

    // Users 0x01xx, household 0x02xx, spaces 0x03xx, objects 0x04xx, people 0x05xx,
    // memories 0x06xx, recordings 0x07xx, steps 0x1000+ (memory × 0x10 + order), progress 0x08xx.
    public static let amine = uuid(0x0101)
    public static let alex = uuid(0x0102)
    public static let household = uuid(0x0201)
    public static let kitchen = uuid(0x0301)
    public static let utilityRoom = uuid(0x0302)
    public static let garage = uuid(0x0303)
    public static let boiler = uuid(0x0401)
    public static let espressoMachine = uuid(0x0402)
    public static let thermostat = uuid(0x0403)
    public static let washingMachine = uuid(0x0404)
    public static let router = uuid(0x0405)
    public static let car = uuid(0x0406)
    public static let dad = uuid(0x0501)
    public static let julien = uuid(0x0502)
    public static let me = uuid(0x0503)
    public static let alexPerson = uuid(0x0504)
    public static let repressuriseBoiler = uuid(0x0601)
    public static let restartBoiler = uuid(0x0602)
    public static let emergencyShutoff = uuid(0x0603)
    public static let cleanGroupHead = uuid(0x0604)
    public static let dadsSettings = uuid(0x0605)
    public static let cleanEspressoMachine = uuid(0x0606)
    public static let backflush = uuid(0x0607)
    public static let changeWaterFilter = uuid(0x0608)
    public static let holidayMode = uuid(0x0609)
    public static let cleanWashingMachineFilter = uuid(0x060A)
    public static let resetRouter = uuid(0x060B)
    public static let topUpWasherFluid = uuid(0x060C)
    public static let boilerRecording = uuid(0x0701)
    public static let espressoProgress = uuid(0x0801)

    /// The id of step `order` inside memory `memoryNumber` (1-based index of the memory).
    public static func step(memory memoryNumber: Int, order: Int) -> UUID {
        uuid(0x1000 + memoryNumber * 0x10 + order)
    }
}

/// Date helpers for sample content, always UTC so seeds are identical on every device.
enum SampleDates {
    static func date(_ year: Int, _ month: Int, _ day: Int, _ hour: Int = 10, _ minute: Int = 0) -> Date {
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = day
        components.hour = hour
        components.minute = minute
        return FreshnessPolicy.utcCalendar.date(from: components)!
    }
}
