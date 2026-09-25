import SwiftUI
import XCTest
@testable import DoOnce

/// The recognition contour: a closed spline with one cubic per hull point.
final class ContourPathTests: XCTestCase {
    private func elements(of path: Path) -> [Path.Element] {
        var out: [Path.Element] = []
        path.forEach { out.append($0) }
        return out
    }

    func testSmoothingProducesClosedPathWithOneCubicPerPoint() {
        let points = ContourPath.hull(around: CGRect(x: 40, y: 80, width: 200, height: 260))
        XCTAssertEqual(points.count, 8)
        let path = ContourPath.smoothed(points)
        let elements = elements(of: path)

        guard case .move(let start) = elements.first else { return XCTFail("path must start with a move") }
        assertSamePoint(start, points[0])
        let curves = elements.filter { if case .curve = $0 { return true } else { return false } }
        XCTAssertEqual(curves.count, points.count)
        guard case .closeSubpath = elements.last else { return XCTFail("path must be closed") }
        if case .curve(let to, _, _) = curves.last { assertSamePoint(to, points[0], "the last cubic returns to the first point") }
    }

    /// `Path` stores its points in single precision, so compare with a tolerance rather than `==`.
    private func assertSamePoint(_ a: CGPoint, _ b: CGPoint, _ message: String = "", file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertEqual(a.x, b.x, accuracy: 0.001, message, file: file, line: line)
        XCTAssertEqual(a.y, b.y, accuracy: 0.001, message, file: file, line: line)
    }

    func testFewerThanThreePointsGivesEmptyPath() {
        XCTAssertTrue(ContourPath.smoothed([CGPoint(x: 0, y: 0), CGPoint(x: 1, y: 1)]).isEmpty)
    }

    func testHullStaysNearTheBox() {
        let rect = CGRect(x: 0, y: 0, width: 100, height: 100)
        let bounds = ContourPath.smoothed(ContourPath.hull(around: rect)).boundingRect
        XCTAssertEqual(bounds.midX, 50, accuracy: 1)
        XCTAssertEqual(bounds.midY, 50, accuracy: 1)
        XCTAssertLessThan(bounds.width, 115)
        XCTAssertGreaterThan(bounds.width, 85)
    }

    func testPreviewGeometryAspectFillMapping() {
        // A 1080×2400 frame (taller than 390×844) into the view: width fits, height overflows and is centred.
        let view = CGSize(width: 390, height: 844)
        let tall = PreviewGeometry.rect(for: CGRect(x: 0, y: 0, width: 1, height: 1), frameSize: CGSize(width: 1080, height: 2400), in: view)
        XCTAssertEqual(tall.minX, 0, accuracy: 0.01)
        XCTAssertEqual(tall.width, 390, accuracy: 0.01)
        XCTAssertEqual(tall.midY, 422, accuracy: 0.01)
        XCTAssertGreaterThan(tall.height, 844)

        // A 9:16 frame is wider than the view: height fits, width overflows and is centred.
        let wide = PreviewGeometry.rect(for: CGRect(x: 0, y: 0, width: 1, height: 1), frameSize: CGSize(width: 1080, height: 1920), in: view)
        XCTAssertEqual(wide.minY, 0, accuracy: 0.01)
        XCTAssertEqual(wide.height, 844, accuracy: 0.01)
        XCTAssertEqual(wide.midX, 195, accuracy: 0.01)
        XCTAssertGreaterThan(wide.width, 390)
    }
}
