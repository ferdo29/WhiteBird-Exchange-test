const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  await sleep(10_000) // ожидаем
  console.log(5000 + 'asidfhnb')


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

  const root = document.getElementById("json");
  const wrapper = document.getElementById("wbExchangeSdkWrapper");

  function errorBox(message, color) {
    if (color) root.style.background = color;
    root.style.display = "flex";
    if (wrapper) wrapper.style.display = "none";
    root.textContent = "Error: " + message;
  }

  function init() {
    if (!wrapper) return errorBox("нет #wbExchangeSdkWrapper");

    if (window.__sdkLoadError) return errorBox("скрипт SDK не загрузился (сеть/домен)");

    const sdk = window.wbExchangeSdk;
    if (!sdk) {
      const candidates = Object.keys(window).filter((k) => /wb|exchange/i.test(k));
      return errorBox("wbExchangeSdk не найден. Похожие глобальные: " + (candidates.join(", ") || "нет"));
    }

    if (!hasAndroid) return errorBox("нет window.Android (страница открыта не в WebView?)");

    let config;
    try {
      config = calls.config();
    } catch (e) {
      return errorBox("Android.config(): " + e.message);
    }

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
  }

  try {
    init();
  } catch (e) {
    errorBox(e.message);
  }
})()
