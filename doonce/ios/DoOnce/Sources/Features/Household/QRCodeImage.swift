import SwiftUI
import CoreImage
import CoreImage.CIFilterBuiltins
import UIKit

/// A real, scannable QR code for a link, drawn in the current text colour on a transparent
/// background so it sits on any page in light and dark.
@MainActor
struct QRCodeImage: View {
    var string: String
    var size: CGFloat = 220

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Group {
            if let image = Self.render(string, ink: UIColor(DSColor.textPrimary).resolvedColor(with: UITraitCollection(userInterfaceStyle: colorScheme == .dark ? .dark : .light))) {
                Image(uiImage: image).interpolation(.none).resizable().scaledToFit()
            } else {
                DSColor.backgroundSunken
            }
        }
        .frame(width: size, height: size)
        .accessibilityLabel(L10n.string("share.import.scan"))
    }

    static func render(_ string: String, ink: UIColor) -> UIImage? {
        let generator = CIFilter.qrCodeGenerator()
        generator.message = Data(string.utf8)
        generator.correctionLevel = "M"
        guard let code = generator.outputImage else { return nil }
        let colored = CIFilter.falseColor()
        colored.inputImage = code
        colored.color0 = CIColor(color: ink)
        colored.color1 = CIColor(red: 0, green: 0, blue: 0, alpha: 0)
        guard let output = colored.outputImage else { return nil }
        let scaled = output.transformed(by: CGAffineTransform(scaleX: 10, y: 10))
        let context = CIContext()
        guard let cg = context.createCGImage(scaled, from: scaled.extent) else { return nil }
        return UIImage(cgImage: cg)
    }
}
