const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('coach', {
  onTip: (handler) => ipcRenderer.on('tip', (_event, tip) => handler(tip)),
  onBeacon: (handler) => ipcRenderer.on('beacon', (_event, preset) => handler(preset)),
  onSiteLine: (handler) => ipcRenderer.on('site-line', (_event, text) => handler(text)),
  reportHeight: (height) => ipcRenderer.send('coach:height', height),
  reportBeacon: (label) => ipcRenderer.send('coach:beacon', label),
  dismiss: () => ipcRenderer.send('coach:dismiss'),
  discuss: () => ipcRenderer.send('coach:discuss'),
  markKnown: () => ipcRenderer.send('coach:mark', 'known'),
  markNotInterested: () => ipcRenderer.send('coach:mark', 'not-interested'),
  markInterested: () => ipcRenderer.send('coach:interested'),
  addNote: (text) => ipcRenderer.send('coach:note', text),
  openSource: (url) => ipcRenderer.send('coach:open-source', url),
  dragStart: (pointer) => ipcRenderer.send('coach:drag-start', pointer),
  drag: (pointer) => ipcRenderer.send('coach:drag', pointer),
  focus: () => ipcRenderer.send('coach:focus'),
})
