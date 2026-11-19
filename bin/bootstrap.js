const { app, BrowserWindow } = require('electron');

function createWindow () {
    let win = new BrowserWindow({
        width: 1200,
        height: 675,
        useContentSize: true,
        resizable: true,
        webPreferences: {
            nodeIntegration: false
        }
    });

    win.setBackgroundColor("#000000");
    win.loadFile('./index.html');
    // Windowed by default for easy playtesting.
}

app.whenReady().then(createWindow);