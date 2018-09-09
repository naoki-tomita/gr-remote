import { ipcRenderer } from "electron";

export async function fetch(
  url: string,
  params: { method: string; headers: any; body: any },
) {
  return new Promise<{ headers: any; body: any; status: number }>(ok => {
    ipcRenderer.once(
      "fetch",
      (_: any, result: any) => (console.log(result), ok(result)),
    );
    ipcRenderer.send("fetch", url, params);
  });
}
