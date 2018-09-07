export async function init() {
  await register();
}

async function register() {
  return navigator.serviceWorker.register("/serviceworker.js");
}
