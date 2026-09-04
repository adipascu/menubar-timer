import { execFile } from 'node:child_process'
import { log } from './log.js'

const TIMEOUT_MS = 5000

const SCRIPT = `tell application "System Events"
  set frontProcess to first application process whose frontmost is true
  if (count of windows of frontProcess) = 0 then return "false"
  repeat with candidate in windows of frontProcess
    if value of attribute "AXFullScreen" of candidate is true then return "true"
  end repeat
  return "false"
end tell`

export const menuBarIsCovered = () =>
  new Promise((resolve) => {
    execFile('osascript', ['-e', SCRIPT], { timeout: TIMEOUT_MS }, (error, stdout) => {
      if (error) {
        log(`fullscreen check failed, treating the menu bar as visible: ${error.message.trim()}`)
        log('grant LockIn Accessibility access in System Settings > Privacy & Security to enable it')
        resolve(false)
        return
      }
      resolve(stdout.trim() === 'true')
    })
  })
