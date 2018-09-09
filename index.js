const { app, BrowserWindow, ipcMain } = require("electron");
const request = require("request");

app.on("window-all-closed", function() {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("ready", () => {
  const mainWindow = new BrowserWindow({ width: 800, height: 600 });
  mainWindow.loadURL(`file://${__dirname}/dist/index.html`);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  ipcMain.on("fetch", async (event, url, params) => {
    const {
      error,
      response = { statusCode: 0, statusMessage: "ERROR", headers: {} },
      body,
    } = await new Promise(ok =>
      request(url, params, (error, response, body) =>
        ok({ error, response, body })
      )
    );
    if (error) {
      console.error(error);
    } else {
      console.log(JSON.parse(body));
    }
    event.sender.send("fetch", {
      headers: response.headers,
      body: JSON.parse(body),
      status: response.statusCode,
      statusText: response.statusMessage,
    });
  });
});
