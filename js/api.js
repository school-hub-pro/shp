/* ============================================================
   School Hub Pro — google.script.run shim for GitHub Pages
   Must be loaded BEFORE app.js.
   ============================================================ */
(function () {
  // ⬇⬇ PASTE YOUR /exec URL BETWEEN THE QUOTES
  var API_URL = 'https://script.google.com/macros/s/AKfy.../exec';

  async function callApi(action, args) {
    // Fail immediately if the browser knows we are offline.
    if (navigator.onLine === false) {
      throw new Error('OFFLINE');
    }

    var res;
    try {
      res = await fetch(API_URL, {
        method: 'POST',
        // text/plain keeps this a CORS "simple request" (no preflight).
        // Apps Script's redirect target doesn't answer OPTIONS.
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: action, args: args || [] }),
        redirect: 'follow'
      });
    } catch (netErr) {
      // fetch() itself threw — DNS failure, connection dropped, host unreachable.
      throw new Error('OFFLINE');
    }

    if (!res.ok) throw new Error('HTTP ' + res.status);
    var text = await res.text();
    var json;
    try { json = JSON.parse(text); }
    catch (e) {
      throw new Error('Non-JSON response from backend: ' + text.slice(0, 120));
    }
    if (!json.ok) throw new Error(json.error || 'Server error');
    return json.data;
  }

  function createRunner() {
    var onSuccess = null;
    var onFailure = null;
    var runner;

    var handlers = {
      withSuccessHandler: function (fn) { onSuccess = fn; return runner; },
      withFailureHandler: function (fn) { onFailure = fn; return runner; },
      withUserObject:     function ()   { return runner; }
    };

    runner = new Proxy({}, {
      get: function (target, prop) {
        if (prop in handlers) return handlers[prop];
        if (typeof prop !== 'string') return undefined;
        return function () {
          var args = Array.prototype.slice.call(arguments);
          callApi(prop, args).then(function (data) {
            if (onSuccess) onSuccess(data);
          }).catch(function (err) {
            // Shim just forwards the error. Each call site decides
            // whether to toast, show a message, or stay silent.
            if (onFailure) onFailure(err);
            else console.error('[api] ' + prop + ' failed:', err.message || err);
          });
        };
      }
    });

    return runner;
  }

  if (!window.google) window.google = {};
  if (!window.google.script) window.google.script = {};
  Object.defineProperty(window.google.script, 'run', {
    get: function () { return createRunner(); },
    configurable: true
  });
})();
