const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('coach', {
  onTip: (handler) => ipcRenderer.on('tip', (_event, tip) => handler(tip)),
  reportHeight: (height) => ipcRenderer.send('coach:height', height),
  dismiss: () => ipcRenderer.send('coach:dismiss'),
  discuss: () => ipcRenderer.send('coach:discuss'),
  openSource: (url) => ipcRenderer.send('coach:open-source', url),
})
