const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('categories', {
  onLoad: (handler) => ipcRenderer.on('categories', (_event, payload) => handler(payload)),
  height: (height) => ipcRenderer.send('categories:height', height),
  save: (categories) => ipcRenderer.send('categories:save', categories),
  cancel: () => ipcRenderer.send('categories:cancel'),
})
