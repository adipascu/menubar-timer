const { app, Tray, Menu, nativeImage } = require('electron')


app.whenReady().then(() => {
  const tray = new Tray(nativeImage.createEmpty())
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Hello', type: 'normal', click: () => console.log("Hello clicked") },
    { role: 'quit' }
  ])
  tray.setToolTip('My App')
  tray.setContextMenu(contextMenu)
  tray.setTitle('00:24:52') // Replace with your desired text
})