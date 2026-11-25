import Cocoa
class Delegate: NSObject, NSApplicationDelegate {
    var window: NSWindow!
    var closed = false
    let control = CommandLine.arguments[1]
    func applicationDidFinishLaunching(_ notification: Notification) {
        window = NSWindow(contentRect: NSRect(x: 100, y: 100, width: 500, height: 350), styleMask: [.titled, .closable, .miniaturizable], backing: .buffered, defer: false)
        window.isReleasedWhenClosed = false
        window.title = "SV lifecycle test"
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { _ in
            if self.closed { return }
            if FileManager.default.fileExists(atPath: self.control + ".close") {
                self.closed = true
                self.window.close()
                self.window = nil
            }
            else if FileManager.default.fileExists(atPath: self.control + ".mini") { if !self.window.isMiniaturized { self.window.miniaturize(nil) } }
            else if self.window.isMiniaturized { self.window.deminiaturize(nil) }
        }
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }
}
let app = NSApplication.shared
let delegate = Delegate()
NSApp.setActivationPolicy(.regular)
NSApp.delegate = delegate
NSApp.run()
