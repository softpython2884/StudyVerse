
import { app, BrowserWindow, nativeTheme, session } from 'electron';
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
    frame: true, // Use native window frame
    transparent: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1c1c1c' : '#ffffff',
    icon: path.join(__dirname, '..', '..', 'ico.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Remove the default Electron menu (File, Edit, etc.)
  mainWindow.setMenu(null);

  const startUrl = 'http://localhost:3000';
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
    // In production, we start the server from the packaged app
    const serverPath = path.join(app.getAppPath(), '..', 'app', '.next', 'standalone');
    const startScript = path.join(serverPath, 'server.js');
    
    serverProcess = exec(`node "${startScript}"`, {
        env: { ...process.env, PORT: '3000' }
    });

    serverProcess.stdout.on('data', (data: any) => {
        console.log(`server: ${data}`);
    });

    serverProcess.stderr.on('data', (data: any) => {
        console.error(`server_error: ${data}`);
    });

    // A more robust way to wait for the server
    const waitOn = require('wait-on');
    waitOn({ resources: ['http://localhost:3000'], timeout: 30000 }) // 30s timeout
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

// Ensure session data (cookies) is persisted to disk before quitting.
app.on('before-quit', (e) => {
    if (session.defaultSession) {
        e.preventDefault();
        session.defaultSession.flushStorageData();
        setTimeout(() => {
            app.quit();
        }, 1000); // Give it a second to flush
    }
});
