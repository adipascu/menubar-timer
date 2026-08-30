const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('task', {
  onLabel: (handler) => ipcRenderer.on('label', (_event, label) => handler(label)),
  save: (label) => ipcRenderer.send('task:save', label),
  cancel: () => ipcRenderer.send('task:cancel'),
})
