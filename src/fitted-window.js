import { app, screen } from 'electron'
import { contentHeightWithin, keptInside, openingBounds } from './window-fit.js'

const cursorWorkArea = () => screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea

export const fitToContent = (target, wanted) => {
  const shown = target.isVisible()
  const area = shown ? screen.getDisplayMatching(target.getBounds()).workArea : cursorWorkArea()
  const [contentWidth, contentHeight] = target.getContentSize()
  const frameHeight = target.getSize()[1] - contentHeight
  target.setContentSize(contentWidth, contentHeightWithin(wanted, area, frameHeight))
  const bounds = target.getBounds()
  target.setBounds(shown ? keptInside(bounds, area) : openingBounds(bounds, area))
}

export const placeOnCursorDisplay = (target) => {
  const area = cursorWorkArea()
  const { width, height } = target.getBounds()
  target.setBounds(openingBounds({ width: Math.min(width, area.width), height: Math.min(height, area.height) }, area))
}

export const showOnCurrentSpace = (target) => {
  if (target.isFullScreen()) {
    app.focus({ steal: true })
    target.show()
    return
  }
  const spaces = { visibleOnFullScreen: true, skipTransformProcessType: true }
  target.setVisibleOnAllWorkspaces(true, spaces)
  app.focus({ steal: true })
  target.show()
  target.setVisibleOnAllWorkspaces(false, spaces)
}

export const resizedByHand = (target) => {
  let resized = false
  target.on('will-resize', () => {
    resized = true
  })
  return () => resized
}
