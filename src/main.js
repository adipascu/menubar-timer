const { app, Tray, Menu, nativeImage } = require('electron')


app.whenReady().then(() => {
  const tray = new Tray(nativeImage.createEmpty())
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Reset Timer', type: 'normal', click: resetTimer },
    { role: 'quit' }
  ])
  tray.setContextMenu(contextMenu)

  let secondsLeft = 5
  let timer = null

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
  }

  function startTimer() {
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

  function resetTimer() {
    clearInterval(timer)
    secondsLeft = 5
    startTimer()
  }

  startTimer()
})