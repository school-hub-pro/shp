/* ============================================================
   School Hub Pro — google.script.run shim for GitHub Pages
   Must be loaded BEFORE app.js.
   ============================================================ */
(function () {
  // ⬇⬇ PASTE YOUR /exec URL BETWEEN THE QUOTES
  var API_URL = 'https://script.google.com/macros/s/AKfycbyVHZVgHFZb2Wn3_YqWdmtq9vDt7ykkSacUS1dLCBBwY9AcnJzIbh35RTfjtJnWrwhOFw/exec';

  async function callApi(action, args) {
    var res = await fetch(API_URL, {
      method: 'POST',
      // text/plain keeps this a CORS "simple request" (no preflight).
      // Apps Script's redirect target does not answer OPTIONS.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, args: args || [] }),
      redirect: 'follow'
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Server error');
    return json.data;
  }

  function createRunner() {
    var onSuccess = null;
    var onFailure = null;
    var runner = {
      withSuccessHandler: function (fn) { onSuccess = fn; return runner; },
      withFailureHandler: function (fn) { onFailure = fn; return runner; },
      withUserObject:     function ()   { return runner; }
    };
    return new Proxy(runner, {
      get: function (target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop !== 'string') return undefined;
        return function () {
          var args = Array.prototype.slice.call(arguments);
          callApi(prop, args).then(function (data) {
            if (onSuccess) onSuccess(data);
          }).catch(function (err) {
            if (onFailure) onFailure(err);
            else console.error('[api] ' + prop + ' failed:', err);
          });
        };
      }
    });
  }

  if (!window.google) window.google = {};
  if (!window.google.script) window.google.script = {};
  Object.defineProperty(window.google.script, 'run', {
    get: function () { return createRunner(); },
    configurable: true
  });
})();
