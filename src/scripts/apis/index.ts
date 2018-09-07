export const api = {
  async get(url: string) {
    return await fetch(`http://192.168.0.1${url}`);
  },
  async post(url: string) {
    return await fetch(`http://192/168.0.1${url}`, { method: "POST" });
  },
  async shoot() {
    const result = await api.post("/v1/camera/shoot?af=camera");
    const obj = await result.json();
    if (obj.errMsg === "Precondition Failed") {
      await api.shootStart();
    }
  },
  async shootStart() {
    return await api.post("/v1/camera/shoot/start?af=camera");
  },
};
