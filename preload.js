const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  aiGenerate: (payload) => ipcRenderer.invoke('ai/generate', payload),
  exportPdf: (html) => ipcRenderer.invoke('export/pdf', { html }),
  exportFdx: (title, fountain) => ipcRenderer.invoke('export/fdx', { title, fountain }),
  onFileOpen: (fn) => ipcRenderer.on('file/open', (e, data) => fn(data)),
  onFileNew: (fn) => ipcRenderer.on('file/new', () => fn()),
  onSave: (fn) => ipcRenderer.on('file/save', () => fn()),
  onExportPdf: (fn) => ipcRenderer.on('file/exportPdf', () => fn()),
  onExportFdx: (fn) => ipcRenderer.on('file/exportFdx', () => fn())
});
