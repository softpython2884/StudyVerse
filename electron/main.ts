import { app, BrowserWindow, nativeTheme } from 'electron';
import * as path from 'path';
import { exec } from 'child_process';
import * as url from 'url';

let mainWindow: BrowserWindow | null = null;
let serverProcess: any;

const isDev = process.env.NODE_ENV !== 'production';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    frame: false, // frameless window
    transparent: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const startUrl = 'http://localhost:9002';
  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  if (isDev) {
    console.log('🚀 Starting Next.js server in development...');
    // We assume the server is started concurrently via `npm run electron:dev`
    createWindow();
  } else {
    console.log('🚀 Starting Next.js server for production...');
    // In production, we'd package the server, but for now we'll run the start script
    // Note: This isn't the final production strategy but works for building.
    const serverPath = path.join(app.getAppPath(), '.next');
    serverProcess = exec(`npm run start`);

    serverProcess.stdout.on('data', (data: any) => {
        console.log(`server: ${data}`);
    });

    serverProcess.stderr.on('data', (data: any) => {
        console.error(`server_error: ${data}`);
    });

    // A more robust way to wait for the server
    const waitOn = require('wait-on');
    waitOn({ resources: ['http://localhost:9002'] })
        .then(() => {
            console.log('Next.js Server is ready. Creating window.');
            createWindow();
        })
        .catch((err: any) => {
            console.error('Server did not start in time.', err);
            app.quit();
        });
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
