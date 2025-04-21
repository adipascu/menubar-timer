import { app, Tray, Menu, nativeImage } from 'electron'

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

const DURATION = 5;

(async () => {
  let secondsLeft = null
  let timer = null

  const startTimer = () => {
    secondsLeft = DURATION
    tray.setTitle(formatTime(secondsLeft))
    timer = setInterval(() => {
      secondsLeft -= 1
      if (secondsLeft <= 0) {
        clearInterval(timer)
        tray.setTitle('Time\'s up!')
      } else {
        tray.setTitle(formatTime(secondsLeft))
      }
    }, 1000)
  }

  const resetTimer = () => {
    clearInterval(timer)
    startTimer()
  }

  await app.whenReady()
  const tray = new Tray(nativeImage.createEmpty())
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Reset Timer', type: 'normal', click: resetTimer },
    { role: 'quit' }
  ])
  tray.setContextMenu(contextMenu)

  startTimer()
})()