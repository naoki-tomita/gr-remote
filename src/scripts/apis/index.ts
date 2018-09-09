import { fetch } from "../utils/AvoidableFetch";
import { Directory, File } from "../models/States/Storage";

const ROOT_DOMAIN = "http://192.168.0.1";

export const api = {
  async exec({
    url,
    method,
    data,
    body,
    formData,
    headers,
  }: {
    url: string;
    method: "GET" | "POST" | "PUT";
    data?: any;
    body?: any;
    formData?: any;
    headers?: any;
  }) {
    const params = data
      ? `?${Object.keys(data)
          .map(k => `${k}=${encodeURIComponent(data[k])}`)
          .join("&")}`
      : "";
    return await fetch(`${ROOT_DOMAIN}${url}${params}`, {
      method,
      headers,
      body: body
        ? JSON.stringify(body)
        : formData
          ? Object.keys(formData)
              .map(k => `${k}=${encodeURIComponent(formData[k])}`)
              .join("&")
          : "",
    });
  },
  async get(options: { url: string; data?: any }) {
    return api.exec({ ...options, method: "GET" });
  },
  async post(options: { url: string; body?: any; data?: any; formData?: any }) {
    return api.exec({
      ...options,
      method: "POST",
      headers: {
        "Content-Type": options.formData
          ? "application/x-www-form-urlencoded; charset=UTF-8"
          : "application/json; charset=utf-8",
      },
    });
  },
  photo: {
    async shoot(autoFocus?: boolean) {
      const formData = autoFocus ? { af: "camera" } : null;
      return await api.post({ url: "/v1/camera/shoot", formData });
    },
  },
  video: {
    async rec(autoFocus?: boolean) {
      const formData = autoFocus ? { af: "camera" } : null;
      return await api.post({ url: "/v1/camera/shoot/start", formData });
    },
    async finish() {
      return await api.post({ url: "/v1/camera/shoot/finish" });
    },
  },
  focus: {
    async lock(pos?: { x: number; y: number }) {
      return await api.post({
        url: "/v1/lens/focus/lock",
        formData: pos ? { pos: `${pos.x},${pos.y}` } : undefined,
      });
    },
    async unlock() {
      return await api.post({
        url: "/v1/lens/focus/unlock",
      });
    },
  },
  storage: {
    resolveUrl(d: Directory, f: File) {
      f.thumbnail = api.storage.thumbnailUrl(d, f);
      f.view = api.storage.viewlUrl(d, f);
      f.raw = api.storage.rawUrl(d, f);
      return f;
    },
    async dirs(): Promise<{ dirs: Directory[] }> {
      const response = await api.get({
        url: "/_gr/objs",
      });
      const dirs = response.body.dirs;
      return {
        dirs: dirs.map(
          (d: any) => (
            (d.files = d.files.map((f: any) => this.resolveUrl(d, f))), d
          ),
        ),
      };
    },
    rawUrl(dir: Directory, file: File) {
      return `${ROOT_DOMAIN}/v1/photos/${dir.name}/${file.n}`;
    },
    thumbnailUrl(dir: Directory, file: File) {
      return `${this.rawUrl(dir, file)}?size=thumb`;
    },
    viewlUrl(dir: Directory, file: File) {
      return `${this.rawUrl(dir, file)}?size=view`;
    },
  },
};
