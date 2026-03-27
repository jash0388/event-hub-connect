const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

const SITE_URL = 'https://datanauts.in';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'DataNauts HUB',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    backgroundColor: '#0a0a0f',
    show: false,
  });

  // Load the website
  mainWindow.loadURL(SITE_URL);

  // Show window when ready (no white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') && !url.includes('datanauts.in')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Handle navigation to external sites
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.includes('datanauts.in') && !url.includes('supabase') && !url.includes('google')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Custom menu
const menuTemplate = [
  {
    label: 'DataNauts',
    submenu: [
      { label: 'Home', click: () => mainWindow.loadURL(SITE_URL) },
      { label: 'Tasks', click: () => mainWindow.loadURL(`${SITE_URL}/tasks`) },
      { label: 'Events', click: () => mainWindow.loadURL(`${SITE_URL}/events`) },
      { type: 'separator' },
      { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
      { type: 'separator' },
      { role: 'quit' },
    ],
  },
  {
    label: 'View',
    submenu: [
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { role: 'resetZoom' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  },
];

app.whenReady().then(() => {
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
