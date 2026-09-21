const hasAndroid = typeof window.Android !== "undefined";
const toJson = (data) => JSON.stringify(data ?? null);

const calls = {
  config: () => JSON.parse(Android.config()),
  onExit: () => Android.onExit(),
  onOrderCreated: (data) => Android.onOrderCreated(toJson(data)),
  onOrderCompleted: (data) => Android.onOrderCompleted(toJson(data)),
  onPayment: (data) => Android.onPayment(toJson(data)),
  onUserData: (data) => Android.onUserData(toJson(data)),
};

// Числовые коды ошибок: пользователь видит только код, детали — в консоли.
const ERROR = {
  UNKNOWN: 1000,
  NO_WRAPPER: 1001,
  SDK_LOAD_FAILED: 1002,
  SDK_NOT_FOUND: 1003,
  NO_ANDROID: 1004,
  CONFIG_FAILED: 1005,
  SETUP_FAILED: 1006,
  SDK_UNREACHABLE: 1007,
  FRAME_LOAD_FAILED: 1008,
};

const SDK_ORIGIN = "https://sdk.dev.wbdevel.net";
const PING_TIMEOUT_MS = 10000;

const wrapper = document.getElementById("wbExchangeSdkWrapper");

function closeApp() {
  try {
    if (hasAndroid) return calls.onExit();
  } catch (e) {
    console.error("Android.onExit():", e);
  }
  window.close();
}

function showError(code, details) {
  console.error("[wbExchange] error " + code + ":", details);

  try {
    window.wbExchangeSdk?.cleanup?.();
  } catch (_) {}

  const container = wrapper || document.body;
  container.innerHTML = `
    <div class="wb-error">
      <div class="wb-error__content">
        <div class="wb-error__title">Что-то пошло не так</div>
        <div class="wb-error__text">Не удалось загрузить сервис. Попробуйте ещё раз.</div>
      </div>
      <div class="wb-error__actions">
        <button type="button" class="wb-error__btn wb-error__btn--primary" data-action="retry">Повторить</button>
        <button type="button" class="wb-error__btn" data-action="close">Закрыть</button>
      </div>
      <div class="wb-error__code">Код ошибки: ${code}</div>
    </div>
  `;

  container.querySelector('[data-action="retry"]').onclick = () =>
    window.location.reload();
  container.querySelector('[data-action="close"]').onclick = closeApp;
}

// Проверяем, что сервер SDK отвечает, до создания iframe —
// иначе WebView покажет внутри него свою страницу "Не удалось открыть веб-страницу".
async function pingSdk() {
  const controller = new AbortController();
  // const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    await fetch(SDK_ORIGIN + "/v2.0/", {
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    // clearTimeout(timer);
  }
}

// Вызывается из Android (WebViewClient.onReceivedError), если iframe SDK не загрузился.
window.wbShowError = (code) =>
  showError(code || ERROR.FRAME_LOAD_FAILED, "ошибка загрузки (native)");

async function init() {
  if (!wrapper) return showError(ERROR.NO_WRAPPER, "нет #wbExchangeSdkWrapper");

  if (window.__sdkLoadError)
    return showError(ERROR.SDK_LOAD_FAILED, "скрипт SDK не загрузился");

  const sdk = window.wbExchangeSdk;
  if (!sdk) return showError(ERROR.SDK_NOT_FOUND, "wbExchangeSdk не найден");

  if (!hasAndroid)
    return showError(ERROR.NO_ANDROID, "нет window.Android");

  let config;
  try {
    config = calls.config();
  } catch (e) {
    return showError(ERROR.CONFIG_FAILED, e);
  }

  try {
    await pingSdk();
  } catch (e) {
    return showError(ERROR.SDK_UNREACHABLE, e);
  }

  try {
    sdk.setup({
      el: wrapper,
      mode: sdk.mode.LoginMode,

      onUserData: calls.onUserData,
      onOrderCreated: calls.onOrderCreated,
      onPayment: calls.onPayment,
      onOrderCompleted: calls.onOrderCompleted,

      onExit: () => {
        sdk.cleanup();
        calls.onExit();
      },
      ...config,
    });
  } catch (e) {
    return showError(ERROR.SETUP_FAILED, e);
  }
}

init().catch((e) => showError(ERROR.UNKNOWN, e));
