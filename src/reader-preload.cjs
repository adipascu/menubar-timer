const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('reader', {
  open: (edition) => ipcRenderer.invoke('reader:open', edition),
  onRefresh: (handler) => ipcRenderer.on('reader:refresh', () => handler()),
  note: (edition, section, patch) => ipcRenderer.invoke('reader:note', edition, section, patch),
  markFinished: (edition, chapter) => ipcRenderer.send('reader:finished', edition, chapter),
  write: () => ipcRenderer.send('reader:write'),
  openSource: (url) => ipcRenderer.send('reader:open-source', url),
})
