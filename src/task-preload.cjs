const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('task', {
  onLabel: (handler) => ipcRenderer.on('label', (_event, label, draft, category) => handler(label, draft, category)),
  draft: (value) => ipcRenderer.send('task:draft', value),
  save: (label) => ipcRenderer.send('task:save', label),
  cancel: () => ipcRenderer.send('task:cancel'),
})
