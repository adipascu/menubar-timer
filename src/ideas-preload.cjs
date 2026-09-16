const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ideas', {
  onLoad: (handler) => ipcRenderer.on('ideas', (_event, notes) => handler(notes)),
  height: (height) => ipcRenderer.send('ideas:height', height),
  save: (notes) => ipcRenderer.send('ideas:save', notes),
  cancel: () => ipcRenderer.send('ideas:cancel'),
})
