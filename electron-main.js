const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const xml2js = require('xml2js');

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
            const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Scripts', extensions: ['fountain','fdx','xml','txt'] }] });
            if (!canceled && filePaths.length) {
              const filePath = filePaths[0];
              const ext = path.extname(filePath).toLowerCase();
              const text = fs.readFileSync(filePath, 'utf8');
              if (ext === '.fdx' || ext === '.xml') {
                parseFdx(text).then(fountain => {
                  mainWindow.webContents.send('file/open', { path: filePath, text: fountain });
                }).catch(err => {
                  dialog.showErrorBox('FDX Import Error', String(err));
                });
              } else {
                mainWindow.webContents.send('file/open', { path: filePath, text });
              }
            }
          } },
        { label: 'Save', click: () => mainWindow.webContents.send('file/save') },
        { type: 'separator' },
        { label: 'Import FDX...', click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Final Draft', extensions: ['fdx','xml'] }] });
            if (!canceled && filePaths.length) {
              const text = fs.readFileSync(filePaths[0], 'utf8');
              parseFdx(text).then(fountain => {
                mainWindow.webContents.send('file/open', { path: filePaths[0], text: fountain });
              }).catch(err => dialog.showErrorBox('Import error', String(err)));
            }
          } },
        { label: 'Export FDX', click: () => mainWindow.webContents.send('file/exportFdx') },
        { label: 'Export PDF...', click: () => mainWindow.webContents.send('file/exportPdf') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    { role: 'help', submenu: [ { label: 'About', click: () => { dialog.showMessageBox({ message: 'Script Studio — Starter\nFDX import/export and PDF export included' }) } } ] }
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

ipcMain.handle('export/fdx', async (event, { title, fountain }) => {
  try {
    const builder = new xml2js.Builder({ headless: true, rootName: 'FinalDraft' });
    const paragraphs = fountain.split(/\n\n+/).map(p => ({ Paragraph: { Text: p } }));
    const doc = { TitlePage: { Title: title || 'Untitled' }, Content: { Paragraphs: paragraphs } };
    const xml = builder.buildObject(doc);
    const { filePath } = await dialog.showSaveDialog({ filters: [{ name: 'Final Draft', extensions: ['fdx','xml'] }], defaultPath: (title||'script') + '.fdx' });
    if (filePath) fs.writeFileSync(filePath, xml, 'utf8');
    return { success: true, path: filePath };
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
});

async function parseFdx(xmlText){
  const parser = new xml2js.Parser();
  const obj = await parser.parseStringPromise(xmlText);
  let texts = [];
  function walk(o){
    if (!o || typeof o !== 'object') return;
    for (const k of Object.keys(o)){
      const v = o[k];
      if (k.toLowerCase().includes('paragraph') && Array.isArray(v)){
        v.forEach(p => {
          if (p.Text) {
            if (Array.isArray(p.Text)) texts.push(p.Text.join('\n'));
            else texts.push(String(p.Text));
          } else if (typeof p === 'string') texts.push(p);
        });
      } else if (Array.isArray(v)) v.forEach(walk); else walk(v);
    }
  }
  walk(obj);
  return texts.join('\n\n') || xmlText;
}
