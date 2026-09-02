import AppKit

let flame = NSAttributedString(string: "🔥", attributes: [.font: NSFont.menuBarFont(ofSize: 0)])
let glyphSize = flame.size()
let pointSize = NSSize(width: ceil(glyphSize.width), height: ceil(glyphSize.height))
let sourceDir = URL(fileURLWithPath: #filePath)
  .deletingLastPathComponent()
  .deletingLastPathComponent()
  .appendingPathComponent("src")

func renderPng(scale: CGFloat) -> Data {
  let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(pointSize.width * scale),
    pixelsHigh: Int(pointSize.height * scale),
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
  flame.draw(in: NSRect(origin: .zero, size: pointSize))
  NSGraphicsContext.restoreGraphicsState()
  bitmap.size = pointSize
  return bitmap.representation(using: .png, properties: [:])!
}

for (suffix, scale) in [("", CGFloat(1)), ("@2x", CGFloat(2))] {
  let file = sourceDir.appendingPathComponent("flame\(suffix).png")
  try! renderPng(scale: scale).write(to: file)
  print("wrote \(file.path) at \(Int(pointSize.width))x\(Int(pointSize.height)) points, scale \(Int(scale))")
}
