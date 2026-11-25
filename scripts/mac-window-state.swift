import Foundation
import CoreGraphics
import Darwin
let group = Int32(CommandLine.arguments.dropFirst().first ?? "") ?? 0
if group <= 1 { exit(2) }
guard let windows = CGWindowListCopyWindowInfo([.optionAll, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] else { exit(3) }
let ids = windows.compactMap { window -> Int? in
    guard let pid = window[kCGWindowOwnerPID as String] as? Int32,
          getpgid(pid) == group,
          let layer = window[kCGWindowLayer as String] as? Int, layer == 0,
          let bounds = window[kCGWindowBounds as String] as? [String: Any],
          let width = bounds["Width"] as? Double, width >= 100,
          let height = bounds["Height"] as? Double, height >= 80 else { return nil }
    return window[kCGWindowNumber as String] as? Int
}
let data = try JSONSerialization.data(withJSONObject: ids)
print(String(data: data, encoding: .utf8)!)
