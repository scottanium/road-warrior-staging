// Staging-only shim. Do not ship this file (or the TEST banner) in the live app.
// Prefixes every localStorage / sessionStorage key with "stg_" so this copy
// never reads or writes the live app's saved data on the same origin.
(function () {
  var PREFIX = "stg_";
  var proto = Storage.prototype;
  var rawGet = proto.getItem;
  var rawSet = proto.setItem;
  var rawRemove = proto.removeItem;
  var rawKey = proto.key;
  var rawClear = proto.clear;
  var lenDesc = Object.getOwnPropertyDescriptor(proto, "length");
  var rawLengthGet = lenDesc && lenDesc.get;

  function pref(k) {
    return PREFIX + String(k == null ? "" : k);
  }
  function rawCount(store) {
    if (rawLengthGet) return rawLengthGet.call(store);
    var i = 0;
    while (rawKey.call(store, i) != null) i++;
    return i;
  }
  function stgKeys(store) {
    var keys = [];
    var n = rawCount(store);
    for (var i = 0; i < n; i++) {
      var k = rawKey.call(store, i);
      if (k && k.indexOf(PREFIX) === 0) keys.push(k);
    }
    return keys;
  }

  proto.getItem = function (k) {
    return rawGet.call(this, pref(k));
  };
  proto.setItem = function (k, v) {
    return rawSet.call(this, pref(k), v);
  };
  proto.removeItem = function (k) {
    return rawRemove.call(this, pref(k));
  };
  proto.key = function (i) {
    var k = stgKeys(this)[i];
    return k ? k.slice(PREFIX.length) : null;
  };
  proto.clear = function () {
    var keys = stgKeys(this);
    for (var i = 0; i < keys.length; i++) rawRemove.call(this, keys[i]);
  };
  try {
    Object.defineProperty(proto, "length", {
      configurable: true,
      enumerable: false,
      get: function () { return stgKeys(this).length; }
    });
  } catch (e) {}

  // Test hook: raw key/value dump (includes live keys). Not used by the app.
  window.__stgInspect = function (which) {
    var store = which === "session" ? sessionStorage : localStorage;
    var out = {};
    var n = rawCount(store);
    for (var i = 0; i < n; i++) {
      var k = rawKey.call(store, i);
      if (k != null) out[k] = rawGet.call(store, k);
    }
    return out;
  };
  window.__STG_PREFIX__ = PREFIX;

  function fit() {
    var el = document.getElementById("pt-staging-banner");
    if (!el) return;
    var h = Math.ceil(el.getBoundingClientRect().height);
    if (h > 0) document.documentElement.style.setProperty("--safe-t", h + "px");
  }
  function bootBanner() {
    var el = document.getElementById("pt-staging-banner");
    if (!el && document.body) {
      el = document.createElement("div");
      el.id = "pt-staging-banner";
      el.setAttribute("role", "status");
      el.textContent = "TEST COPY - staging";
      document.body.insertBefore(el, document.body.firstChild);
    }
    fit();
  }
  if (document.body) bootBanner();
  else document.addEventListener("DOMContentLoaded", bootBanner);
  window.addEventListener("resize", fit);
})();
