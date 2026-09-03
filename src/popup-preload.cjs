const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('coach', {
  onTip: (handler) => ipcRenderer.on('tip', (_event, tip) => handler(tip)),
  reportHeight: (height) => ipcRenderer.send('coach:height', height),
  dismiss: () => ipcRenderer.send('coach:dismiss'),
  discuss: () => ipcRenderer.send('coach:discuss'),
  markKnown: () => ipcRenderer.send('coach:mark', 'known'),
  markNotInterested: () => ipcRenderer.send('coach:mark', 'not-interested'),
  markInterested: () => ipcRenderer.send('coach:interested'),
  openSource: (url) => ipcRenderer.send('coach:open-source', url),
  selected: () => ipcRenderer.send('coach:selected'),
})
