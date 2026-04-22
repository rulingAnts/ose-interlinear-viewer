// In Tauri, external links can't open in the webview's browsing context.
// This intercepts clicks on any http/https link and routes them through
// the native opener so they open in the user's default OS browser.
// On the web version this script is a no-op; target="_blank" handles it.
if (window.__TAURI__) {
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
      e.preventDefault();
      window.__TAURI__.core.invoke('open_url', { url: href });
    }
  });
}
