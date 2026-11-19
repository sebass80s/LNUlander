/**
 * macOS CI renderer smoke test.
 * Launch with: npx electron scripts/smoke-electron.js
 * A screenshot and structural assertions give evidence that Rune actually starts.
 */
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const errors = [];
const timeout = setTimeout(() => {
    console.error('Renderer startup timeout');
    app.exit(1);
}, 20000);

app.whenReady().then(async () => {
    const win = new BrowserWindow({
        width: 1200,
        height: 675,
        show: false,
        backgroundColor: '#081322',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    win.webContents.on('render-process-gone', (event, details) => {
        errors.push('Renderer exited: ' + JSON.stringify(details));
    });
    win.webContents.on('did-fail-load', (event, code, description) => {
        if (code !== -3) errors.push('Load failed: ' + code + ' ' + description);
    });
    win.webContents.on('console-message', (event, details, oldMessage) => {
        const msg = typeof details === 'object' ? details.message : oldMessage;
        if (typeof msg === 'string' && /Uncaught|ReferenceError|TypeError/.test(msg)) {
            errors.push(msg);
        }
    });

    try {
        const relative = process.argv.includes('--site') ?
            path.join('site', 'index.html') : path.join('bin-debug', 'index.html');
        await win.loadFile(path.join(__dirname, '..', relative));
        await new Promise(resolve => setTimeout(resolve, 2000));
        const result = await win.webContents.executeJavaScript(`(() => {
            const canvas = document.querySelector("canvas");
            const ctx = canvas && canvas.getContext("2d");
            const pixel = ctx ? Array.from(ctx.getImageData(200, 160, 1, 1).data) : [];
            return {
                rune: typeof rune !== "undefined",
                namespace: typeof lnulander !== "undefined",
                application: typeof rune !== "undefined" &&
                    Boolean(rune.system.Application.instance),
                model: typeof lnulander !== "undefined" &&
                    Boolean(lnulander.model && lnulander.model.Landing),
                canvasCount: document.querySelectorAll("canvas").length,
                canvasSize: canvas ? [canvas.width, canvas.height] : [],
                pixel: pixel
            };
        })()`);
        fs.mkdirSync(path.join(__dirname, '..', 'artifacts'), { recursive: true });
        const image = await win.webContents.capturePage();
        fs.writeFileSync(path.join(__dirname, '..', 'artifacts', process.argv.includes('--site') ? 'rune-web-smoke.png' : 'rune-smoke.png'), image.toPNG());
        console.log('Renderer smoke:', JSON.stringify(result));
        const webMode = process.argv.includes('--site');
        const drawn = result.pixel.length === 4 &&
            (result.pixel[0] > 0 || result.pixel[1] > 0 || result.pixel[2] > 0);
        const works = webMode ?
            (result.namespace && result.model && result.canvasCount === 1 && drawn) :
            (result.rune && result.namespace && result.application && result.canvasCount === 1);
        if (!works || errors.length) {
            throw new Error('Renderer smoke failed: ' + JSON.stringify(errors));
        }
        clearTimeout(timeout);
        app.exit(0);
    } catch (error) {
        console.error(error.stack || String(error));
        console.error('Renderer errors:', JSON.stringify(errors));
        clearTimeout(timeout);
        app.exit(1);
    }
}).catch(error => {
    console.error(error.stack || String(error));
    clearTimeout(timeout);
    app.exit(1);
});
