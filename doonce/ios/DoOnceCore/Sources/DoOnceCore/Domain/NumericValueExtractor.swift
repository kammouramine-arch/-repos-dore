import Foundation

/// A number with a unit, as spoken: "1.5 bar", "60 degrees".
public struct MeasuredValue: Hashable, Sendable {
    public var value: Double
    /// Canonical unit: "bar", "psi", "°C", "L", "ml", "%", "min", "s", "V", "A", "W", "mm", "cm", "turns", "clicks".
    public var unit: String
    /// The text as it appeared.
    public var raw: String

    public init(value: Double, unit: String, raw: String) {
        self.value = value
        self.unit = unit
        self.raw = raw
    }

    /// "1.5 bar" — trailing zeros dropped.
    public var formatted: String {
        let number = value == value.rounded() ? String(Int(value)) : String(value)
        return "\(number) \(unit)"
    }
}

/// Finds numbers with units in spoken text.
public enum NumericValueExtractor {
    /// Spoken unit → canonical unit.
    static let unitAliases: [String: String] = [
        "bar": "bar", "bars": "bar",
        "psi": "psi",
        "degree": "°C", "degrees": "°C", "celsius": "°C", "°c": "°C", "°": "°C", "c": "°C",
        "litre": "L", "litres": "L", "liter": "L", "liters": "L",
        "ml": "ml", "millilitre": "ml", "millilitres": "ml", "milliliter": "ml", "milliliters": "ml",
        "percent": "%", "%": "%",
        "minute": "min", "minutes": "min", "min": "min", "mins": "min",
        "second": "s", "seconds": "s", "sec": "s", "secs": "s",
        "hour": "h", "hours": "h", "hr": "h", "hrs": "h",
        "volt": "V", "volts": "V",
        "amp": "A", "amps": "A",
        "watt": "W", "watts": "W",
        "mm": "mm", "millimetre": "mm", "millimetres": "mm",
        "cm": "cm", "centimetre": "cm", "centimetres": "cm",
        "turn": "turns", "turns": "turns",
        "click": "clicks", "clicks": "clicks",
        "gram": "g", "grams": "g", "g": "g",
        "kg": "kg", "kilo": "kg", "kilos": "kg",
    ]

    /// Every value-with-unit in the text, in order of appearance.
    public static func extract(from text: String) -> [MeasuredValue] {
        let pattern = /(\d+(?:[.,]\d+)?)\s*(°\s*c|°|[a-zA-Z%]+)\b/.ignoresCase()
        var results: [MeasuredValue] = []
        for match in text.matches(of: pattern) {
            let numberText = match.output.1.replacingOccurrences(of: ",", with: ".")
            let unitText = match.output.2.lowercased().replacingOccurrences(of: " ", with: "")
            guard let value = Double(numberText), let unit = unitAliases[unitText] else { continue }
            // "c" and "g" alone are too ambiguous unless attached directly ("40c").
            if (unitText == "c" || unitText == "g"), match.output.0.contains(" ") { continue }
            results.append(MeasuredValue(value: value, unit: unit, raw: String(match.output.0)))
        }
        return results
    }

    /// The first value in the text, if any.
    public static func first(in text: String) -> MeasuredValue? {
        extract(from: text).first
    }
}
