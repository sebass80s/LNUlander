const { app, BrowserWindow } = require('electron');
const path = require('node:path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 675,
        useContentSize: true,
        resizable: true,
        backgroundColor: '#081322',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // Use the actual script directory, independent of Electron's current working directory.
    win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createWindow);
