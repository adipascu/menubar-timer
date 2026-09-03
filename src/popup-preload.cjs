const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('coach', {
  onTip: (handler) => ipcRenderer.on('tip', (_event, tip) => handler(tip)),
  reportHeight: (height) => ipcRenderer.send('coach:height', height),
  reportBeacon: (label) => ipcRenderer.send('coach:beacon', label),
  dismiss: () => ipcRenderer.send('coach:dismiss'),
  discuss: () => ipcRenderer.send('coach:discuss'),
  markKnown: () => ipcRenderer.send('coach:mark', 'known'),
  markNotInterested: () => ipcRenderer.send('coach:mark', 'not-interested'),
  openSource: (url) => ipcRenderer.send('coach:open-source', url),
})
