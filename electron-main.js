const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  buildMenu();
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New', click: () => mainWindow.webContents.send('file/new') },
        { label: 'Open...', click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Fountain/Script', extensions: ['fountain','txt'] }] });
            if (!canceled && filePaths.length) {
              const text = fs.readFileSync(filePaths[0], 'utf8');
              mainWindow.webContents.send('file/open', { path: filePaths[0], text });
            }
          } },
        { label: 'Save', click: () => mainWindow.webContents.send('file/save') },
        { type: 'separator' },
        { label: 'Export PDF', click: () => mainWindow.webContents.send('file/exportPdf') },
        { label: 'Export FDX', click: () => mainWindow.webContents.send('file/exportFdx') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    { role: 'help', submenu: [ { label: 'About', click: () => { dialog.showMessageBox({ message: 'Script Studio — Starter\nMinimal screenplay editor with PDF & FDX export' }) } } ] }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Simple PDF export: create a hidden window to render HTML and print to PDF
ipcMain.handle('export/pdf', async (event, { html }) => {
  try {
    const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const pdf = await win.webContents.printToPDF({ marginsType: 1, printBackground: true, pageSize: 'A4' });
    const { filePath } = await dialog.showSaveDialog({ filters: [{ name: 'PDF', extensions: ['pdf'] }], defaultPath: 'script.pdf' });
    if (filePath) fs.writeFileSync(filePath, pdf);
    win.destroy();
    return { success: true, path: filePath };
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
});

// Simple FDX export: accept plain text/fountain and build a minimal FDX XML
ipcMain.handle('export/fdx', async (event, { title, fountain }) => {
  try {
    // Minimal FDX generator (not full schema, but compatible with many apps)
    const scenes = fountain.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<FinalDraft DocumentType=\"Script\">\n<TitlePage>\n<Title>${escapeXml(title || 'Untitled')}</Title>\n</TitlePage>\n<Content>`;
    let counter = 1;
    scenes.forEach(s => {
      xml += `\n  <Paragraph Type=\"Scene Heading\">\n    <Text>${escapeXml(s.replace(/&/g,'&amp;'))}</Text>\n  </Paragraph>`;
      counter++;
    });
    xml += '\n</Content>\n</FinalDraft>';
    const { filePath } = await dialog.showSaveDialog({ filters: [{ name: 'Final Draft', extensions: ['fdx','xml'] }], defaultPath: (title||'script') + '.fdx' });
    if (filePath) fs.writeFileSync(filePath, xml, 'utf8');
    return { success: true, path: filePath };
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
});

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'\"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}
