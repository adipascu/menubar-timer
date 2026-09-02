import AppKit

let font = NSFont.monospacedDigitSystemFont(ofSize: 0, weight: .regular)
let glyphs: [(name: String, text: String)] = [
  ("0", "0"), ("1", "1"), ("2", "2"), ("3", "3"), ("4", "4"),
  ("5", "5"), ("6", "6"), ("7", "7"), ("8", "8"), ("9", "9"),
  ("dot", "."), ("space", " "), ("W", "W"),
]
let attributes: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: NSColor.black]
let cellHeight = ceil(NSAttributedString(string: "0123456789.W", attributes: attributes).size().height)
let outputDir = URL(fileURLWithPath: #filePath)
  .deletingLastPathComponent()
  .deletingLastPathComponent()
  .appendingPathComponent("src")
  .appendingPathComponent("glyphs")

func renderPng(_ text: NSAttributedString, size: NSSize, scale: CGFloat) -> Data {
  let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(size.width * scale),
    pixelsHigh: Int(size.height * scale),
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
  )!
  NSGraphicsContext.saveGraphicsState()
  let context = NSGraphicsContext(bitmapImageRep: bitmap)!
  NSGraphicsContext.current = context
  context.cgContext.scaleBy(x: scale, y: scale)
  text.draw(in: NSRect(origin: .zero, size: size))
  NSGraphicsContext.restoreGraphicsState()
  bitmap.size = size
  return bitmap.representation(using: .png, properties: [:])!
}

try! FileManager.default.createDirectory(at: outputDir, withIntermediateDirectories: true)
print("font \(font.fontName) \(font.pointSize) pt, cell height \(Int(cellHeight)) points")
for glyph in glyphs {
  let text = NSAttributedString(string: glyph.text, attributes: attributes)
  let size = NSSize(width: ceil(text.size().width), height: cellHeight)
  for (suffix, scale) in [("", CGFloat(1)), ("@2x", CGFloat(2))] {
    let file = outputDir.appendingPathComponent("\(glyph.name)\(suffix).png")
    try! renderPng(text, size: size, scale: scale).write(to: file)
  }
  print("wrote \(glyph.name) at \(Int(size.width))x\(Int(size.height)) points")
}
