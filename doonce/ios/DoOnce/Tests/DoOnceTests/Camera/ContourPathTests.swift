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
        XCTAssertEqual(start, points[0])
        let curves = elements.filter { if case .curve = $0 { return true } else { return false } }
        XCTAssertEqual(curves.count, points.count)
        guard case .closeSubpath = elements.last else { return XCTFail("path must be closed") }
        if case .curve(let to, _, _) = curves.last { XCTAssertEqual(to, points[0], "the last cubic returns to the first point") }
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
        // 1080×1920 frame into a 390×844 view: width fits, height overflows and is centred.
        let view = CGSize(width: 390, height: 844)
        let full = PreviewGeometry.rect(for: CGRect(x: 0, y: 0, width: 1, height: 1), frameSize: CGSize(width: 1080, height: 1920), in: view)
        XCTAssertEqual(full.minX, 0, accuracy: 0.01)
        XCTAssertEqual(full.width, 390, accuracy: 0.01)
        XCTAssertEqual(full.midY, 422, accuracy: 0.01)
        XCTAssertGreaterThan(full.height, 844)
    }
}
