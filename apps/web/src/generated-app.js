(function() {
  const t = document.createElement("link").relList;
  if (t && t.supports && t.supports("modulepreload")) return;
  for (const a of document.querySelectorAll('link[rel="modulepreload"]')) r(a);
  new MutationObserver((a) => {
    for (const s of a) if (s.type === "childList") for (const i of s.addedNodes) i.tagName === "LINK" && i.rel === "modulepreload" && r(i);
  }).observe(document, { childList: true, subtree: true });
  function n(a) {
    const s = {};
    return a.integrity && (s.integrity = a.integrity), a.referrerPolicy && (s.referrerPolicy = a.referrerPolicy), a.crossOrigin === "use-credentials" ? s.credentials = "include" : a.crossOrigin === "anonymous" ? s.credentials = "omit" : s.credentials = "same-origin", s;
  }
  function r(a) {
    if (a.ep) return;
    a.ep = true;
    const s = n(a);
    fetch(a.href, s);
  }
})();
(function() {
  const e = document.createElement("link").relList;
  if (e && e.supports && e.supports("modulepreload")) return;
  for (const r of document.querySelectorAll('link[rel="modulepreload"]')) n(r);
  new MutationObserver((r) => {
    for (const a of r) if (a.type === "childList") for (const s of a.addedNodes) s.tagName === "LINK" && s.rel === "modulepreload" && n(s);
  }).observe(document, { childList: true, subtree: true });
  function t(r) {
    const a = {};
    return r.integrity && (a.integrity = r.integrity), r.referrerPolicy && (a.referrerPolicy = r.referrerPolicy), r.crossOrigin === "use-credentials" ? a.credentials = "include" : r.crossOrigin === "anonymous" ? a.credentials = "omit" : a.credentials = "same-origin", a;
  }
  function n(r) {
    if (r.ep) return;
    r.ep = true;
    const a = t(r);
    fetch(r.href, a);
  }
})();
(function() {
  const e = document.createElement("link").relList;
  if (e && e.supports && e.supports("modulepreload")) return;
  for (const r of document.querySelectorAll('link[rel="modulepreload"]')) n(r);
  new MutationObserver((r) => {
    for (const a of r) if (a.type === "childList") for (const s of a.addedNodes) s.tagName === "LINK" && s.rel === "modulepreload" && n(s);
  }).observe(document, { childList: true, subtree: true });
  function t(r) {
    const a = {};
    return r.integrity && (a.integrity = r.integrity), r.referrerPolicy && (a.referrerPolicy = r.referrerPolicy), r.crossOrigin === "use-credentials" ? a.credentials = "include" : r.crossOrigin === "anonymous" ? a.credentials = "omit" : a.credentials = "same-origin", a;
  }
  function n(r) {
    if (r.ep) return;
    r.ep = true;
    const a = t(r);
    fetch(r.href, a);
  }
})();
var $o = { exports: {} }, Vl = {}, Mo = { exports: {} }, D = {};
var Ur = /* @__PURE__ */ Symbol.for("react.element"), kd = /* @__PURE__ */ Symbol.for("react.portal"), Sd = /* @__PURE__ */ Symbol.for("react.fragment"), Cd = /* @__PURE__ */ Symbol.for("react.strict_mode"), Nd = /* @__PURE__ */ Symbol.for("react.profiler"), Ed = /* @__PURE__ */ Symbol.for("react.provider"), Pd = /* @__PURE__ */ Symbol.for("react.context"), _d = /* @__PURE__ */ Symbol.for("react.forward_ref"), Td = /* @__PURE__ */ Symbol.for("react.suspense"), Id = /* @__PURE__ */ Symbol.for("react.memo"), Ld = /* @__PURE__ */ Symbol.for("react.lazy"), Ci = Symbol.iterator;
function Od(e) {
  return e === null || typeof e != "object" ? null : (e = Ci && e[Ci] || e["@@iterator"], typeof e == "function" ? e : null);
}
var Do = { isMounted: function() {
  return false;
}, enqueueForceUpdate: function() {
}, enqueueReplaceState: function() {
}, enqueueSetState: function() {
} }, Ao = Object.assign, Bo = {};
function Kn(e, t, n) {
  this.props = e, this.context = t, this.refs = Bo, this.updater = n || Do;
}
Kn.prototype.isReactComponent = {};
Kn.prototype.setState = function(e, t) {
  if (typeof e != "object" && typeof e != "function" && e != null) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
  this.updater.enqueueSetState(this, e, t, "setState");
};
Kn.prototype.forceUpdate = function(e) {
  this.updater.enqueueForceUpdate(this, e, "forceUpdate");
};
function Qo() {
}
Qo.prototype = Kn.prototype;
function Es(e, t, n) {
  this.props = e, this.context = t, this.refs = Bo, this.updater = n || Do;
}
var Ps = Es.prototype = new Qo();
Ps.constructor = Es;
Ao(Ps, Kn.prototype);
Ps.isPureReactComponent = true;
var Ni = Array.isArray, Ho = Object.prototype.hasOwnProperty, _s = { current: null }, Wo = { key: true, ref: true, __self: true, __source: true };
function Vo(e, t, n) {
  var r, a = {}, s = null, i = null;
  if (t != null) for (r in t.ref !== void 0 && (i = t.ref), t.key !== void 0 && (s = "" + t.key), t) Ho.call(t, r) && !Wo.hasOwnProperty(r) && (a[r] = t[r]);
  var o = arguments.length - 2;
  if (o === 1) a.children = n;
  else if (1 < o) {
    for (var u = Array(o), f = 0; f < o; f++) u[f] = arguments[f + 2];
    a.children = u;
  }
  if (e && e.defaultProps) for (r in o = e.defaultProps, o) a[r] === void 0 && (a[r] = o[r]);
  return { $$typeof: Ur, type: e, key: s, ref: i, props: a, _owner: _s.current };
}
function Rd(e, t) {
  return { $$typeof: Ur, type: e.type, key: t, ref: e.ref, props: e.props, _owner: e._owner };
}
function Ts(e) {
  return typeof e == "object" && e !== null && e.$$typeof === Ur;
}
function zd(e) {
  var t = { "=": "=0", ":": "=2" };
  return "$" + e.replace(/[=:]/g, function(n) {
    return t[n];
  });
}
var Ei = /\/+/g;
function oa(e, t) {
  return typeof e == "object" && e !== null && e.key != null ? zd("" + e.key) : t.toString(36);
}
function il(e, t, n, r, a) {
  var s = typeof e;
  (s === "undefined" || s === "boolean") && (e = null);
  var i = false;
  if (e === null) i = true;
  else switch (s) {
    case "string":
    case "number":
      i = true;
      break;
    case "object":
      switch (e.$$typeof) {
        case Ur:
        case kd:
          i = true;
      }
  }
  if (i) return i = e, a = a(i), e = r === "" ? "." + oa(i, 0) : r, Ni(a) ? (n = "", e != null && (n = e.replace(Ei, "$&/") + "/"), il(a, t, n, "", function(f) {
    return f;
  })) : a != null && (Ts(a) && (a = Rd(a, n + (!a.key || i && i.key === a.key ? "" : ("" + a.key).replace(Ei, "$&/") + "/") + e)), t.push(a)), 1;
  if (i = 0, r = r === "" ? "." : r + ":", Ni(e)) for (var o = 0; o < e.length; o++) {
    s = e[o];
    var u = r + oa(s, o);
    i += il(s, t, n, u, a);
  }
  else if (u = Od(e), typeof u == "function") for (e = u.call(e), o = 0; !(s = e.next()).done; ) s = s.value, u = r + oa(s, o++), i += il(s, t, n, u, a);
  else if (s === "object") throw t = String(e), Error("Objects are not valid as a React child (found: " + (t === "[object Object]" ? "object with keys {" + Object.keys(e).join(", ") + "}" : t) + "). If you meant to render a collection of children, use an array instead.");
  return i;
}
function Br(e, t, n) {
  if (e == null) return e;
  var r = [], a = 0;
  return il(e, r, "", "", function(s) {
    return t.call(n, s, a++);
  }), r;
}
function Fd(e) {
  if (e._status === -1) {
    var t = e._result;
    t = t(), t.then(function(n) {
      (e._status === 0 || e._status === -1) && (e._status = 1, e._result = n);
    }, function(n) {
      (e._status === 0 || e._status === -1) && (e._status = 2, e._result = n);
    }), e._status === -1 && (e._status = 0, e._result = t);
  }
  if (e._status === 1) return e._result.default;
  throw e._result;
}
var Ne = { current: null }, ol = { transition: null }, Ud = { ReactCurrentDispatcher: Ne, ReactCurrentBatchConfig: ol, ReactCurrentOwner: _s };
function Ko() {
  throw Error("act(...) is not supported in production builds of React.");
}
D.Children = { map: Br, forEach: function(e, t, n) {
  Br(e, function() {
    t.apply(this, arguments);
  }, n);
}, count: function(e) {
  var t = 0;
  return Br(e, function() {
    t++;
  }), t;
}, toArray: function(e) {
  return Br(e, function(t) {
    return t;
  }) || [];
}, only: function(e) {
  if (!Ts(e)) throw Error("React.Children.only expected to receive a single React element child.");
  return e;
} };
D.Component = Kn;
D.Fragment = Sd;
D.Profiler = Nd;
D.PureComponent = Es;
D.StrictMode = Cd;
D.Suspense = Td;
D.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Ud;
D.act = Ko;
D.cloneElement = function(e, t, n) {
  if (e == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + e + ".");
  var r = Ao({}, e.props), a = e.key, s = e.ref, i = e._owner;
  if (t != null) {
    if (t.ref !== void 0 && (s = t.ref, i = _s.current), t.key !== void 0 && (a = "" + t.key), e.type && e.type.defaultProps) var o = e.type.defaultProps;
    for (u in t) Ho.call(t, u) && !Wo.hasOwnProperty(u) && (r[u] = t[u] === void 0 && o !== void 0 ? o[u] : t[u]);
  }
  var u = arguments.length - 2;
  if (u === 1) r.children = n;
  else if (1 < u) {
    o = Array(u);
    for (var f = 0; f < u; f++) o[f] = arguments[f + 2];
    r.children = o;
  }
  return { $$typeof: Ur, type: e.type, key: a, ref: s, props: r, _owner: i };
};
D.createContext = function(e) {
  return e = { $$typeof: Pd, _currentValue: e, _currentValue2: e, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, e.Provider = { $$typeof: Ed, _context: e }, e.Consumer = e;
};
D.createElement = Vo;
D.createFactory = function(e) {
  var t = Vo.bind(null, e);
  return t.type = e, t;
};
D.createRef = function() {
  return { current: null };
};
D.forwardRef = function(e) {
  return { $$typeof: _d, render: e };
};
D.isValidElement = Ts;
D.lazy = function(e) {
  return { $$typeof: Ld, _payload: { _status: -1, _result: e }, _init: Fd };
};
D.memo = function(e, t) {
  return { $$typeof: Id, type: e, compare: t === void 0 ? null : t };
};
D.startTransition = function(e) {
  var t = ol.transition;
  ol.transition = {};
  try {
    e();
  } finally {
    ol.transition = t;
  }
};
D.unstable_act = Ko;
D.useCallback = function(e, t) {
  return Ne.current.useCallback(e, t);
};
D.useContext = function(e) {
  return Ne.current.useContext(e);
};
D.useDebugValue = function() {
};
D.useDeferredValue = function(e) {
  return Ne.current.useDeferredValue(e);
};
D.useEffect = function(e, t) {
  return Ne.current.useEffect(e, t);
};
D.useId = function() {
  return Ne.current.useId();
};
D.useImperativeHandle = function(e, t, n) {
  return Ne.current.useImperativeHandle(e, t, n);
};
D.useInsertionEffect = function(e, t) {
  return Ne.current.useInsertionEffect(e, t);
};
D.useLayoutEffect = function(e, t) {
  return Ne.current.useLayoutEffect(e, t);
};
D.useMemo = function(e, t) {
  return Ne.current.useMemo(e, t);
};
D.useReducer = function(e, t, n) {
  return Ne.current.useReducer(e, t, n);
};
D.useRef = function(e) {
  return Ne.current.useRef(e);
};
D.useState = function(e) {
  return Ne.current.useState(e);
};
D.useSyncExternalStore = function(e, t, n) {
  return Ne.current.useSyncExternalStore(e, t, n);
};
D.useTransition = function() {
  return Ne.current.useTransition();
};
D.version = "18.3.1";
Mo.exports = D;
var C = Mo.exports;
var $d = C, Md = /* @__PURE__ */ Symbol.for("react.element"), Dd = /* @__PURE__ */ Symbol.for("react.fragment"), Ad = Object.prototype.hasOwnProperty, Bd = $d.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, Qd = { key: true, ref: true, __self: true, __source: true };
function qo(e, t, n) {
  var r, a = {}, s = null, i = null;
  n !== void 0 && (s = "" + n), t.key !== void 0 && (s = "" + t.key), t.ref !== void 0 && (i = t.ref);
  for (r in t) Ad.call(t, r) && !Qd.hasOwnProperty(r) && (a[r] = t[r]);
  if (e && e.defaultProps) for (r in t = e.defaultProps, t) a[r] === void 0 && (a[r] = t[r]);
  return { $$typeof: Md, type: e, key: s, ref: i, props: a, _owner: Bd.current };
}
Vl.Fragment = Dd;
Vl.jsx = qo;
Vl.jsxs = qo;
$o.exports = Vl;
var l = $o.exports, Go = { exports: {} }, Me = {}, Yo = { exports: {} }, Xo = {};
(function(e) {
  function t(E, z) {
    var U = E.length;
    E.push(z);
    e: for (; 0 < U; ) {
      var K = U - 1 >>> 1, G = E[K];
      if (0 < a(G, z)) E[K] = z, E[U] = G, U = K;
      else break e;
    }
  }
  function n(E) {
    return E.length === 0 ? null : E[0];
  }
  function r(E) {
    if (E.length === 0) return null;
    var z = E[0], U = E.pop();
    if (U !== z) {
      E[0] = U;
      e: for (var K = 0, G = E.length, j = G >>> 1; K < j; ) {
        var R = 2 * (K + 1) - 1, je = E[R], we = R + 1, at = E[we];
        if (0 > a(je, U)) we < G && 0 > a(at, je) ? (E[K] = at, E[we] = U, K = we) : (E[K] = je, E[R] = U, K = R);
        else if (we < G && 0 > a(at, U)) E[K] = at, E[we] = U, K = we;
        else break e;
      }
    }
    return z;
  }
  function a(E, z) {
    var U = E.sortIndex - z.sortIndex;
    return U !== 0 ? U : E.id - z.id;
  }
  if (typeof performance == "object" && typeof performance.now == "function") {
    var s = performance;
    e.unstable_now = function() {
      return s.now();
    };
  } else {
    var i = Date, o = i.now();
    e.unstable_now = function() {
      return i.now() - o;
    };
  }
  var u = [], f = [], v = 1, p = null, g = 3, m = false, x = false, y = false, L = typeof setTimeout == "function" ? setTimeout : null, c = typeof clearTimeout == "function" ? clearTimeout : null, d = typeof setImmediate < "u" ? setImmediate : null;
  typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
  function h(E) {
    for (var z = n(f); z !== null; ) {
      if (z.callback === null) r(f);
      else if (z.startTime <= E) r(f), z.sortIndex = z.expirationTime, t(u, z);
      else break;
      z = n(f);
    }
  }
  function b(E) {
    if (y = false, h(E), !x) if (n(u) !== null) x = true, qe(S);
    else {
      var z = n(f);
      z !== null && nn(b, z.startTime - E);
    }
  }
  function S(E, z) {
    x = false, y && (y = false, c(k), k = -1), m = true;
    var U = g;
    try {
      for (h(z), p = n(u); p !== null && (!(p.expirationTime > z) || E && !ce()); ) {
        var K = p.callback;
        if (typeof K == "function") {
          p.callback = null, g = p.priorityLevel;
          var G = K(p.expirationTime <= z);
          z = e.unstable_now(), typeof G == "function" ? p.callback = G : p === n(u) && r(u), h(z);
        } else r(u);
        p = n(u);
      }
      if (p !== null) var j = true;
      else {
        var R = n(f);
        R !== null && nn(b, R.startTime - z), j = false;
      }
      return j;
    } finally {
      p = null, g = U, m = false;
    }
  }
  var N = false, P = null, k = -1, V = 5, I = -1;
  function ce() {
    return !(e.unstable_now() - I < V);
  }
  function $() {
    if (P !== null) {
      var E = e.unstable_now();
      I = E;
      var z = true;
      try {
        z = P(true, E);
      } finally {
        z ? lt() : (N = false, P = null);
      }
    } else N = false;
  }
  var lt;
  if (typeof d == "function") lt = function() {
    d($);
  };
  else if (typeof MessageChannel < "u") {
    var Rt = new MessageChannel(), Xn = Rt.port2;
    Rt.port1.onmessage = $, lt = function() {
      Xn.postMessage(null);
    };
  } else lt = function() {
    L($, 0);
  };
  function qe(E) {
    P = E, N || (N = true, lt());
  }
  function nn(E, z) {
    k = L(function() {
      E(e.unstable_now());
    }, z);
  }
  e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(E) {
    E.callback = null;
  }, e.unstable_continueExecution = function() {
    x || m || (x = true, qe(S));
  }, e.unstable_forceFrameRate = function(E) {
    0 > E || 125 < E ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : V = 0 < E ? Math.floor(1e3 / E) : 5;
  }, e.unstable_getCurrentPriorityLevel = function() {
    return g;
  }, e.unstable_getFirstCallbackNode = function() {
    return n(u);
  }, e.unstable_next = function(E) {
    switch (g) {
      case 1:
      case 2:
      case 3:
        var z = 3;
        break;
      default:
        z = g;
    }
    var U = g;
    g = z;
    try {
      return E();
    } finally {
      g = U;
    }
  }, e.unstable_pauseExecution = function() {
  }, e.unstable_requestPaint = function() {
  }, e.unstable_runWithPriority = function(E, z) {
    switch (E) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
        break;
      default:
        E = 3;
    }
    var U = g;
    g = E;
    try {
      return z();
    } finally {
      g = U;
    }
  }, e.unstable_scheduleCallback = function(E, z, U) {
    var K = e.unstable_now();
    switch (typeof U == "object" && U !== null ? (U = U.delay, U = typeof U == "number" && 0 < U ? K + U : K) : U = K, E) {
      case 1:
        var G = -1;
        break;
      case 2:
        G = 250;
        break;
      case 5:
        G = 1073741823;
        break;
      case 4:
        G = 1e4;
        break;
      default:
        G = 5e3;
    }
    return G = U + G, E = { id: v++, callback: z, priorityLevel: E, startTime: U, expirationTime: G, sortIndex: -1 }, U > K ? (E.sortIndex = U, t(f, E), n(u) === null && E === n(f) && (y ? (c(k), k = -1) : y = true, nn(b, U - K))) : (E.sortIndex = G, t(u, E), x || m || (x = true, qe(S))), E;
  }, e.unstable_shouldYield = ce, e.unstable_wrapCallback = function(E) {
    var z = g;
    return function() {
      var U = g;
      g = z;
      try {
        return E.apply(this, arguments);
      } finally {
        g = U;
      }
    };
  };
})(Xo);
Yo.exports = Xo;
var Hd = Yo.exports;
var Wd = C, $e = Hd;
function w(e) {
  for (var t = "https://reactjs.org/docs/error-decoder.html?invariant=" + e, n = 1; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
  return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
}
var Jo = /* @__PURE__ */ new Set(), br = {};
function yn(e, t) {
  Dn(e, t), Dn(e + "Capture", t);
}
function Dn(e, t) {
  for (br[e] = t, e = 0; e < t.length; e++) Jo.add(t[e]);
}
var bt = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), Fa = Object.prototype.hasOwnProperty, Vd = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, Pi = {}, _i = {};
function Kd(e) {
  return Fa.call(_i, e) ? true : Fa.call(Pi, e) ? false : Vd.test(e) ? _i[e] = true : (Pi[e] = true, false);
}
function qd(e, t, n, r) {
  if (n !== null && n.type === 0) return false;
  switch (typeof t) {
    case "function":
    case "symbol":
      return true;
    case "boolean":
      return r ? false : n !== null ? !n.acceptsBooleans : (e = e.toLowerCase().slice(0, 5), e !== "data-" && e !== "aria-");
    default:
      return false;
  }
}
function Gd(e, t, n, r) {
  if (t === null || typeof t > "u" || qd(e, t, n, r)) return true;
  if (r) return false;
  if (n !== null) switch (n.type) {
    case 3:
      return !t;
    case 4:
      return t === false;
    case 5:
      return isNaN(t);
    case 6:
      return isNaN(t) || 1 > t;
  }
  return false;
}
function Ee(e, t, n, r, a, s, i) {
  this.acceptsBooleans = t === 2 || t === 3 || t === 4, this.attributeName = r, this.attributeNamespace = a, this.mustUseProperty = n, this.propertyName = e, this.type = t, this.sanitizeURL = s, this.removeEmptyString = i;
}
var ge = {};
"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e) {
  ge[e] = new Ee(e, 0, false, e, null, false, false);
});
[["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(e) {
  var t = e[0];
  ge[t] = new Ee(t, 1, false, e[1], null, false, false);
});
["contentEditable", "draggable", "spellCheck", "value"].forEach(function(e) {
  ge[e] = new Ee(e, 2, false, e.toLowerCase(), null, false, false);
});
["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(e) {
  ge[e] = new Ee(e, 2, false, e, null, false, false);
});
"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e) {
  ge[e] = new Ee(e, 3, false, e.toLowerCase(), null, false, false);
});
["checked", "multiple", "muted", "selected"].forEach(function(e) {
  ge[e] = new Ee(e, 3, true, e, null, false, false);
});
["capture", "download"].forEach(function(e) {
  ge[e] = new Ee(e, 4, false, e, null, false, false);
});
["cols", "rows", "size", "span"].forEach(function(e) {
  ge[e] = new Ee(e, 6, false, e, null, false, false);
});
["rowSpan", "start"].forEach(function(e) {
  ge[e] = new Ee(e, 5, false, e.toLowerCase(), null, false, false);
});
var Is = /[\-:]([a-z])/g;
function Ls(e) {
  return e[1].toUpperCase();
}
"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e) {
  var t = e.replace(Is, Ls);
  ge[t] = new Ee(t, 1, false, e, null, false, false);
});
"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e) {
  var t = e.replace(Is, Ls);
  ge[t] = new Ee(t, 1, false, e, "http://www.w3.org/1999/xlink", false, false);
});
["xml:base", "xml:lang", "xml:space"].forEach(function(e) {
  var t = e.replace(Is, Ls);
  ge[t] = new Ee(t, 1, false, e, "http://www.w3.org/XML/1998/namespace", false, false);
});
["tabIndex", "crossOrigin"].forEach(function(e) {
  ge[e] = new Ee(e, 1, false, e.toLowerCase(), null, false, false);
});
ge.xlinkHref = new Ee("xlinkHref", 1, false, "xlink:href", "http://www.w3.org/1999/xlink", true, false);
["src", "href", "action", "formAction"].forEach(function(e) {
  ge[e] = new Ee(e, 1, false, e.toLowerCase(), null, true, true);
});
function Os(e, t, n, r) {
  var a = ge.hasOwnProperty(t) ? ge[t] : null;
  (a !== null ? a.type !== 0 : r || !(2 < t.length) || t[0] !== "o" && t[0] !== "O" || t[1] !== "n" && t[1] !== "N") && (Gd(t, n, a, r) && (n = null), r || a === null ? Kd(t) && (n === null ? e.removeAttribute(t) : e.setAttribute(t, "" + n)) : a.mustUseProperty ? e[a.propertyName] = n === null ? a.type === 3 ? false : "" : n : (t = a.attributeName, r = a.attributeNamespace, n === null ? e.removeAttribute(t) : (a = a.type, n = a === 3 || a === 4 && n === true ? "" : "" + n, r ? e.setAttributeNS(r, t, n) : e.setAttribute(t, n))));
}
var Ot = Wd.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, Qr = /* @__PURE__ */ Symbol.for("react.element"), jn = /* @__PURE__ */ Symbol.for("react.portal"), wn = /* @__PURE__ */ Symbol.for("react.fragment"), Rs = /* @__PURE__ */ Symbol.for("react.strict_mode"), Ua = /* @__PURE__ */ Symbol.for("react.profiler"), Zo = /* @__PURE__ */ Symbol.for("react.provider"), eu = /* @__PURE__ */ Symbol.for("react.context"), zs = /* @__PURE__ */ Symbol.for("react.forward_ref"), $a = /* @__PURE__ */ Symbol.for("react.suspense"), Ma = /* @__PURE__ */ Symbol.for("react.suspense_list"), Fs = /* @__PURE__ */ Symbol.for("react.memo"), Ut = /* @__PURE__ */ Symbol.for("react.lazy"), tu = /* @__PURE__ */ Symbol.for("react.offscreen"), Ti = Symbol.iterator;
function Jn(e) {
  return e === null || typeof e != "object" ? null : (e = Ti && e[Ti] || e["@@iterator"], typeof e == "function" ? e : null);
}
var te = Object.assign, ua;
function sr(e) {
  if (ua === void 0) try {
    throw Error();
  } catch (n) {
    var t = n.stack.trim().match(/\n( *(at )?)/);
    ua = t && t[1] || "";
  }
  return `
` + ua + e;
}
var ca = false;
function da(e, t) {
  if (!e || ca) return "";
  ca = true;
  var n = Error.prepareStackTrace;
  Error.prepareStackTrace = void 0;
  try {
    if (t) if (t = function() {
      throw Error();
    }, Object.defineProperty(t.prototype, "props", { set: function() {
      throw Error();
    } }), typeof Reflect == "object" && Reflect.construct) {
      try {
        Reflect.construct(t, []);
      } catch (f) {
        var r = f;
      }
      Reflect.construct(e, [], t);
    } else {
      try {
        t.call();
      } catch (f) {
        r = f;
      }
      e.call(t.prototype);
    }
    else {
      try {
        throw Error();
      } catch (f) {
        r = f;
      }
      e();
    }
  } catch (f) {
    if (f && r && typeof f.stack == "string") {
      for (var a = f.stack.split(`
`), s = r.stack.split(`
`), i = a.length - 1, o = s.length - 1; 1 <= i && 0 <= o && a[i] !== s[o]; ) o--;
      for (; 1 <= i && 0 <= o; i--, o--) if (a[i] !== s[o]) {
        if (i !== 1 || o !== 1) do
          if (i--, o--, 0 > o || a[i] !== s[o]) {
            var u = `
` + a[i].replace(" at new ", " at ");
            return e.displayName && u.includes("<anonymous>") && (u = u.replace("<anonymous>", e.displayName)), u;
          }
        while (1 <= i && 0 <= o);
        break;
      }
    }
  } finally {
    ca = false, Error.prepareStackTrace = n;
  }
  return (e = e ? e.displayName || e.name : "") ? sr(e) : "";
}
function Yd(e) {
  switch (e.tag) {
    case 5:
      return sr(e.type);
    case 16:
      return sr("Lazy");
    case 13:
      return sr("Suspense");
    case 19:
      return sr("SuspenseList");
    case 0:
    case 2:
    case 15:
      return e = da(e.type, false), e;
    case 11:
      return e = da(e.type.render, false), e;
    case 1:
      return e = da(e.type, true), e;
    default:
      return "";
  }
}
function Da(e) {
  if (e == null) return null;
  if (typeof e == "function") return e.displayName || e.name || null;
  if (typeof e == "string") return e;
  switch (e) {
    case wn:
      return "Fragment";
    case jn:
      return "Portal";
    case Ua:
      return "Profiler";
    case Rs:
      return "StrictMode";
    case $a:
      return "Suspense";
    case Ma:
      return "SuspenseList";
  }
  if (typeof e == "object") switch (e.$$typeof) {
    case eu:
      return (e.displayName || "Context") + ".Consumer";
    case Zo:
      return (e._context.displayName || "Context") + ".Provider";
    case zs:
      var t = e.render;
      return e = e.displayName, e || (e = t.displayName || t.name || "", e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef"), e;
    case Fs:
      return t = e.displayName || null, t !== null ? t : Da(e.type) || "Memo";
    case Ut:
      t = e._payload, e = e._init;
      try {
        return Da(e(t));
      } catch {
      }
  }
  return null;
}
function Xd(e) {
  var t = e.type;
  switch (e.tag) {
    case 24:
      return "Cache";
    case 9:
      return (t.displayName || "Context") + ".Consumer";
    case 10:
      return (t._context.displayName || "Context") + ".Provider";
    case 18:
      return "DehydratedFragment";
    case 11:
      return e = t.render, e = e.displayName || e.name || "", t.displayName || (e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef");
    case 7:
      return "Fragment";
    case 5:
      return t;
    case 4:
      return "Portal";
    case 3:
      return "Root";
    case 6:
      return "Text";
    case 16:
      return Da(t);
    case 8:
      return t === Rs ? "StrictMode" : "Mode";
    case 22:
      return "Offscreen";
    case 12:
      return "Profiler";
    case 21:
      return "Scope";
    case 13:
      return "Suspense";
    case 19:
      return "SuspenseList";
    case 25:
      return "TracingMarker";
    case 1:
    case 0:
    case 17:
    case 2:
    case 14:
    case 15:
      if (typeof t == "function") return t.displayName || t.name || null;
      if (typeof t == "string") return t;
  }
  return null;
}
function Xt(e) {
  switch (typeof e) {
    case "boolean":
    case "number":
    case "string":
    case "undefined":
      return e;
    case "object":
      return e;
    default:
      return "";
  }
}
function nu(e) {
  var t = e.type;
  return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
}
function Jd(e) {
  var t = nu(e) ? "checked" : "value", n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t), r = "" + e[t];
  if (!e.hasOwnProperty(t) && typeof n < "u" && typeof n.get == "function" && typeof n.set == "function") {
    var a = n.get, s = n.set;
    return Object.defineProperty(e, t, { configurable: true, get: function() {
      return a.call(this);
    }, set: function(i) {
      r = "" + i, s.call(this, i);
    } }), Object.defineProperty(e, t, { enumerable: n.enumerable }), { getValue: function() {
      return r;
    }, setValue: function(i) {
      r = "" + i;
    }, stopTracking: function() {
      e._valueTracker = null, delete e[t];
    } };
  }
}
function Hr(e) {
  e._valueTracker || (e._valueTracker = Jd(e));
}
function ru(e) {
  if (!e) return false;
  var t = e._valueTracker;
  if (!t) return true;
  var n = t.getValue(), r = "";
  return e && (r = nu(e) ? e.checked ? "true" : "false" : e.value), e = r, e !== n ? (t.setValue(e), true) : false;
}
function xl(e) {
  if (e = e || (typeof document < "u" ? document : void 0), typeof e > "u") return null;
  try {
    return e.activeElement || e.body;
  } catch {
    return e.body;
  }
}
function Aa(e, t) {
  var n = t.checked;
  return te({}, t, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: n ?? e._wrapperState.initialChecked });
}
function Ii(e, t) {
  var n = t.defaultValue == null ? "" : t.defaultValue, r = t.checked != null ? t.checked : t.defaultChecked;
  n = Xt(t.value != null ? t.value : n), e._wrapperState = { initialChecked: r, initialValue: n, controlled: t.type === "checkbox" || t.type === "radio" ? t.checked != null : t.value != null };
}
function lu(e, t) {
  t = t.checked, t != null && Os(e, "checked", t, false);
}
function Ba(e, t) {
  lu(e, t);
  var n = Xt(t.value), r = t.type;
  if (n != null) r === "number" ? (n === 0 && e.value === "" || e.value != n) && (e.value = "" + n) : e.value !== "" + n && (e.value = "" + n);
  else if (r === "submit" || r === "reset") {
    e.removeAttribute("value");
    return;
  }
  t.hasOwnProperty("value") ? Qa(e, t.type, n) : t.hasOwnProperty("defaultValue") && Qa(e, t.type, Xt(t.defaultValue)), t.checked == null && t.defaultChecked != null && (e.defaultChecked = !!t.defaultChecked);
}
function Li(e, t, n) {
  if (t.hasOwnProperty("value") || t.hasOwnProperty("defaultValue")) {
    var r = t.type;
    if (!(r !== "submit" && r !== "reset" || t.value !== void 0 && t.value !== null)) return;
    t = "" + e._wrapperState.initialValue, n || t === e.value || (e.value = t), e.defaultValue = t;
  }
  n = e.name, n !== "" && (e.name = ""), e.defaultChecked = !!e._wrapperState.initialChecked, n !== "" && (e.name = n);
}
function Qa(e, t, n) {
  (t !== "number" || xl(e.ownerDocument) !== e) && (n == null ? e.defaultValue = "" + e._wrapperState.initialValue : e.defaultValue !== "" + n && (e.defaultValue = "" + n));
}
var ir = Array.isArray;
function On(e, t, n, r) {
  if (e = e.options, t) {
    t = {};
    for (var a = 0; a < n.length; a++) t["$" + n[a]] = true;
    for (n = 0; n < e.length; n++) a = t.hasOwnProperty("$" + e[n].value), e[n].selected !== a && (e[n].selected = a), a && r && (e[n].defaultSelected = true);
  } else {
    for (n = "" + Xt(n), t = null, a = 0; a < e.length; a++) {
      if (e[a].value === n) {
        e[a].selected = true, r && (e[a].defaultSelected = true);
        return;
      }
      t !== null || e[a].disabled || (t = e[a]);
    }
    t !== null && (t.selected = true);
  }
}
function Ha(e, t) {
  if (t.dangerouslySetInnerHTML != null) throw Error(w(91));
  return te({}, t, { value: void 0, defaultValue: void 0, children: "" + e._wrapperState.initialValue });
}
function Oi(e, t) {
  var n = t.value;
  if (n == null) {
    if (n = t.children, t = t.defaultValue, n != null) {
      if (t != null) throw Error(w(92));
      if (ir(n)) {
        if (1 < n.length) throw Error(w(93));
        n = n[0];
      }
      t = n;
    }
    t == null && (t = ""), n = t;
  }
  e._wrapperState = { initialValue: Xt(n) };
}
function au(e, t) {
  var n = Xt(t.value), r = Xt(t.defaultValue);
  n != null && (n = "" + n, n !== e.value && (e.value = n), t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)), r != null && (e.defaultValue = "" + r);
}
function Ri(e) {
  var t = e.textContent;
  t === e._wrapperState.initialValue && t !== "" && t !== null && (e.value = t);
}
function su(e) {
  switch (e) {
    case "svg":
      return "http://www.w3.org/2000/svg";
    case "math":
      return "http://www.w3.org/1998/Math/MathML";
    default:
      return "http://www.w3.org/1999/xhtml";
  }
}
function Wa(e, t) {
  return e == null || e === "http://www.w3.org/1999/xhtml" ? su(t) : e === "http://www.w3.org/2000/svg" && t === "foreignObject" ? "http://www.w3.org/1999/xhtml" : e;
}
var Wr, iu = (function(e) {
  return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(t, n, r, a) {
    MSApp.execUnsafeLocalFunction(function() {
      return e(t, n, r, a);
    });
  } : e;
})(function(e, t) {
  if (e.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in e) e.innerHTML = t;
  else {
    for (Wr = Wr || document.createElement("div"), Wr.innerHTML = "<svg>" + t.valueOf().toString() + "</svg>", t = Wr.firstChild; e.firstChild; ) e.removeChild(e.firstChild);
    for (; t.firstChild; ) e.appendChild(t.firstChild);
  }
});
function jr(e, t) {
  if (t) {
    var n = e.firstChild;
    if (n && n === e.lastChild && n.nodeType === 3) {
      n.nodeValue = t;
      return;
    }
  }
  e.textContent = t;
}
var cr = { animationIterationCount: true, aspectRatio: true, borderImageOutset: true, borderImageSlice: true, borderImageWidth: true, boxFlex: true, boxFlexGroup: true, boxOrdinalGroup: true, columnCount: true, columns: true, flex: true, flexGrow: true, flexPositive: true, flexShrink: true, flexNegative: true, flexOrder: true, gridArea: true, gridRow: true, gridRowEnd: true, gridRowSpan: true, gridRowStart: true, gridColumn: true, gridColumnEnd: true, gridColumnSpan: true, gridColumnStart: true, fontWeight: true, lineClamp: true, lineHeight: true, opacity: true, order: true, orphans: true, tabSize: true, widows: true, zIndex: true, zoom: true, fillOpacity: true, floodOpacity: true, stopOpacity: true, strokeDasharray: true, strokeDashoffset: true, strokeMiterlimit: true, strokeOpacity: true, strokeWidth: true }, Zd = ["Webkit", "ms", "Moz", "O"];
Object.keys(cr).forEach(function(e) {
  Zd.forEach(function(t) {
    t = t + e.charAt(0).toUpperCase() + e.substring(1), cr[t] = cr[e];
  });
});
function ou(e, t, n) {
  return t == null || typeof t == "boolean" || t === "" ? "" : n || typeof t != "number" || t === 0 || cr.hasOwnProperty(e) && cr[e] ? ("" + t).trim() : t + "px";
}
function uu(e, t) {
  e = e.style;
  for (var n in t) if (t.hasOwnProperty(n)) {
    var r = n.indexOf("--") === 0, a = ou(n, t[n], r);
    n === "float" && (n = "cssFloat"), r ? e.setProperty(n, a) : e[n] = a;
  }
}
var ef = te({ menuitem: true }, { area: true, base: true, br: true, col: true, embed: true, hr: true, img: true, input: true, keygen: true, link: true, meta: true, param: true, source: true, track: true, wbr: true });
function Va(e, t) {
  if (t) {
    if (ef[e] && (t.children != null || t.dangerouslySetInnerHTML != null)) throw Error(w(137, e));
    if (t.dangerouslySetInnerHTML != null) {
      if (t.children != null) throw Error(w(60));
      if (typeof t.dangerouslySetInnerHTML != "object" || !("__html" in t.dangerouslySetInnerHTML)) throw Error(w(61));
    }
    if (t.style != null && typeof t.style != "object") throw Error(w(62));
  }
}
function Ka(e, t) {
  if (e.indexOf("-") === -1) return typeof t.is == "string";
  switch (e) {
    case "annotation-xml":
    case "color-profile":
    case "font-face":
    case "font-face-src":
    case "font-face-uri":
    case "font-face-format":
    case "font-face-name":
    case "missing-glyph":
      return false;
    default:
      return true;
  }
}
var qa = null;
function Us(e) {
  return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
}
var Ga = null, Rn = null, zn = null;
function zi(e) {
  if (e = Dr(e)) {
    if (typeof Ga != "function") throw Error(w(280));
    var t = e.stateNode;
    t && (t = Xl(t), Ga(e.stateNode, e.type, t));
  }
}
function cu(e) {
  Rn ? zn ? zn.push(e) : zn = [e] : Rn = e;
}
function du() {
  if (Rn) {
    var e = Rn, t = zn;
    if (zn = Rn = null, zi(e), t) for (e = 0; e < t.length; e++) zi(t[e]);
  }
}
function fu(e, t) {
  return e(t);
}
function pu() {
}
var fa = false;
function hu(e, t, n) {
  if (fa) return e(t, n);
  fa = true;
  try {
    return fu(e, t, n);
  } finally {
    fa = false, (Rn !== null || zn !== null) && (pu(), du());
  }
}
function wr(e, t) {
  var n = e.stateNode;
  if (n === null) return null;
  var r = Xl(n);
  if (r === null) return null;
  n = r[t];
  e: switch (t) {
    case "onClick":
    case "onClickCapture":
    case "onDoubleClick":
    case "onDoubleClickCapture":
    case "onMouseDown":
    case "onMouseDownCapture":
    case "onMouseMove":
    case "onMouseMoveCapture":
    case "onMouseUp":
    case "onMouseUpCapture":
    case "onMouseEnter":
      (r = !r.disabled) || (e = e.type, r = !(e === "button" || e === "input" || e === "select" || e === "textarea")), e = !r;
      break e;
    default:
      e = false;
  }
  if (e) return null;
  if (n && typeof n != "function") throw Error(w(231, t, typeof n));
  return n;
}
var Ya = false;
if (bt) try {
  var Zn = {};
  Object.defineProperty(Zn, "passive", { get: function() {
    Ya = true;
  } }), window.addEventListener("test", Zn, Zn), window.removeEventListener("test", Zn, Zn);
} catch {
  Ya = false;
}
function tf(e, t, n, r, a, s, i, o, u) {
  var f = Array.prototype.slice.call(arguments, 3);
  try {
    t.apply(n, f);
  } catch (v) {
    this.onError(v);
  }
}
var dr = false, bl = null, jl = false, Xa = null, nf = { onError: function(e) {
  dr = true, bl = e;
} };
function rf(e, t, n, r, a, s, i, o, u) {
  dr = false, bl = null, tf.apply(nf, arguments);
}
function lf(e, t, n, r, a, s, i, o, u) {
  if (rf.apply(this, arguments), dr) {
    if (dr) {
      var f = bl;
      dr = false, bl = null;
    } else throw Error(w(198));
    jl || (jl = true, Xa = f);
  }
}
function xn(e) {
  var t = e, n = e;
  if (e.alternate) for (; t.return; ) t = t.return;
  else {
    e = t;
    do
      t = e, t.flags & 4098 && (n = t.return), e = t.return;
    while (e);
  }
  return t.tag === 3 ? n : null;
}
function mu(e) {
  if (e.tag === 13) {
    var t = e.memoizedState;
    if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
  }
  return null;
}
function Fi(e) {
  if (xn(e) !== e) throw Error(w(188));
}
function af(e) {
  var t = e.alternate;
  if (!t) {
    if (t = xn(e), t === null) throw Error(w(188));
    return t !== e ? null : e;
  }
  for (var n = e, r = t; ; ) {
    var a = n.return;
    if (a === null) break;
    var s = a.alternate;
    if (s === null) {
      if (r = a.return, r !== null) {
        n = r;
        continue;
      }
      break;
    }
    if (a.child === s.child) {
      for (s = a.child; s; ) {
        if (s === n) return Fi(a), e;
        if (s === r) return Fi(a), t;
        s = s.sibling;
      }
      throw Error(w(188));
    }
    if (n.return !== r.return) n = a, r = s;
    else {
      for (var i = false, o = a.child; o; ) {
        if (o === n) {
          i = true, n = a, r = s;
          break;
        }
        if (o === r) {
          i = true, r = a, n = s;
          break;
        }
        o = o.sibling;
      }
      if (!i) {
        for (o = s.child; o; ) {
          if (o === n) {
            i = true, n = s, r = a;
            break;
          }
          if (o === r) {
            i = true, r = s, n = a;
            break;
          }
          o = o.sibling;
        }
        if (!i) throw Error(w(189));
      }
    }
    if (n.alternate !== r) throw Error(w(190));
  }
  if (n.tag !== 3) throw Error(w(188));
  return n.stateNode.current === n ? e : t;
}
function gu(e) {
  return e = af(e), e !== null ? vu(e) : null;
}
function vu(e) {
  if (e.tag === 5 || e.tag === 6) return e;
  for (e = e.child; e !== null; ) {
    var t = vu(e);
    if (t !== null) return t;
    e = e.sibling;
  }
  return null;
}
var yu = $e.unstable_scheduleCallback, Ui = $e.unstable_cancelCallback, sf = $e.unstable_shouldYield, of = $e.unstable_requestPaint, le = $e.unstable_now, uf = $e.unstable_getCurrentPriorityLevel, $s = $e.unstable_ImmediatePriority, xu = $e.unstable_UserBlockingPriority, wl = $e.unstable_NormalPriority, cf = $e.unstable_LowPriority, bu = $e.unstable_IdlePriority, Kl = null, ut = null;
function df(e) {
  if (ut && typeof ut.onCommitFiberRoot == "function") try {
    ut.onCommitFiberRoot(Kl, e, void 0, (e.current.flags & 128) === 128);
  } catch {
  }
}
var tt = Math.clz32 ? Math.clz32 : hf, ff = Math.log, pf = Math.LN2;
function hf(e) {
  return e >>>= 0, e === 0 ? 32 : 31 - (ff(e) / pf | 0) | 0;
}
var Vr = 64, Kr = 4194304;
function or(e) {
  switch (e & -e) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 4:
      return 4;
    case 8:
      return 8;
    case 16:
      return 16;
    case 32:
      return 32;
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return e & 4194240;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return e & 130023424;
    case 134217728:
      return 134217728;
    case 268435456:
      return 268435456;
    case 536870912:
      return 536870912;
    case 1073741824:
      return 1073741824;
    default:
      return e;
  }
}
function kl(e, t) {
  var n = e.pendingLanes;
  if (n === 0) return 0;
  var r = 0, a = e.suspendedLanes, s = e.pingedLanes, i = n & 268435455;
  if (i !== 0) {
    var o = i & ~a;
    o !== 0 ? r = or(o) : (s &= i, s !== 0 && (r = or(s)));
  } else i = n & ~a, i !== 0 ? r = or(i) : s !== 0 && (r = or(s));
  if (r === 0) return 0;
  if (t !== 0 && t !== r && !(t & a) && (a = r & -r, s = t & -t, a >= s || a === 16 && (s & 4194240) !== 0)) return t;
  if (r & 4 && (r |= n & 16), t = e.entangledLanes, t !== 0) for (e = e.entanglements, t &= r; 0 < t; ) n = 31 - tt(t), a = 1 << n, r |= e[n], t &= ~a;
  return r;
}
function mf(e, t) {
  switch (e) {
    case 1:
    case 2:
    case 4:
      return t + 250;
    case 8:
    case 16:
    case 32:
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return t + 5e3;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return -1;
    case 134217728:
    case 268435456:
    case 536870912:
    case 1073741824:
      return -1;
    default:
      return -1;
  }
}
function gf(e, t) {
  for (var n = e.suspendedLanes, r = e.pingedLanes, a = e.expirationTimes, s = e.pendingLanes; 0 < s; ) {
    var i = 31 - tt(s), o = 1 << i, u = a[i];
    u === -1 ? (!(o & n) || o & r) && (a[i] = mf(o, t)) : u <= t && (e.expiredLanes |= o), s &= ~o;
  }
}
function Ja(e) {
  return e = e.pendingLanes & -1073741825, e !== 0 ? e : e & 1073741824 ? 1073741824 : 0;
}
function ju() {
  var e = Vr;
  return Vr <<= 1, !(Vr & 4194240) && (Vr = 64), e;
}
function pa(e) {
  for (var t = [], n = 0; 31 > n; n++) t.push(e);
  return t;
}
function $r(e, t, n) {
  e.pendingLanes |= t, t !== 536870912 && (e.suspendedLanes = 0, e.pingedLanes = 0), e = e.eventTimes, t = 31 - tt(t), e[t] = n;
}
function vf(e, t) {
  var n = e.pendingLanes & ~t;
  e.pendingLanes = t, e.suspendedLanes = 0, e.pingedLanes = 0, e.expiredLanes &= t, e.mutableReadLanes &= t, e.entangledLanes &= t, t = e.entanglements;
  var r = e.eventTimes;
  for (e = e.expirationTimes; 0 < n; ) {
    var a = 31 - tt(n), s = 1 << a;
    t[a] = 0, r[a] = -1, e[a] = -1, n &= ~s;
  }
}
function Ms(e, t) {
  var n = e.entangledLanes |= t;
  for (e = e.entanglements; n; ) {
    var r = 31 - tt(n), a = 1 << r;
    a & t | e[r] & t && (e[r] |= t), n &= ~a;
  }
}
var W = 0;
function wu(e) {
  return e &= -e, 1 < e ? 4 < e ? e & 268435455 ? 16 : 536870912 : 4 : 1;
}
var ku, Ds, Su, Cu, Nu, Za = false, qr = [], Qt = null, Ht = null, Wt = null, kr = /* @__PURE__ */ new Map(), Sr = /* @__PURE__ */ new Map(), Mt = [], yf = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
function $i(e, t) {
  switch (e) {
    case "focusin":
    case "focusout":
      Qt = null;
      break;
    case "dragenter":
    case "dragleave":
      Ht = null;
      break;
    case "mouseover":
    case "mouseout":
      Wt = null;
      break;
    case "pointerover":
    case "pointerout":
      kr.delete(t.pointerId);
      break;
    case "gotpointercapture":
    case "lostpointercapture":
      Sr.delete(t.pointerId);
  }
}
function er(e, t, n, r, a, s) {
  return e === null || e.nativeEvent !== s ? (e = { blockedOn: t, domEventName: n, eventSystemFlags: r, nativeEvent: s, targetContainers: [a] }, t !== null && (t = Dr(t), t !== null && Ds(t)), e) : (e.eventSystemFlags |= r, t = e.targetContainers, a !== null && t.indexOf(a) === -1 && t.push(a), e);
}
function xf(e, t, n, r, a) {
  switch (t) {
    case "focusin":
      return Qt = er(Qt, e, t, n, r, a), true;
    case "dragenter":
      return Ht = er(Ht, e, t, n, r, a), true;
    case "mouseover":
      return Wt = er(Wt, e, t, n, r, a), true;
    case "pointerover":
      var s = a.pointerId;
      return kr.set(s, er(kr.get(s) || null, e, t, n, r, a)), true;
    case "gotpointercapture":
      return s = a.pointerId, Sr.set(s, er(Sr.get(s) || null, e, t, n, r, a)), true;
  }
  return false;
}
function Eu(e) {
  var t = sn(e.target);
  if (t !== null) {
    var n = xn(t);
    if (n !== null) {
      if (t = n.tag, t === 13) {
        if (t = mu(n), t !== null) {
          e.blockedOn = t, Nu(e.priority, function() {
            Su(n);
          });
          return;
        }
      } else if (t === 3 && n.stateNode.current.memoizedState.isDehydrated) {
        e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
        return;
      }
    }
  }
  e.blockedOn = null;
}
function ul(e) {
  if (e.blockedOn !== null) return false;
  for (var t = e.targetContainers; 0 < t.length; ) {
    var n = es(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
    if (n === null) {
      n = e.nativeEvent;
      var r = new n.constructor(n.type, n);
      qa = r, n.target.dispatchEvent(r), qa = null;
    } else return t = Dr(n), t !== null && Ds(t), e.blockedOn = n, false;
    t.shift();
  }
  return true;
}
function Mi(e, t, n) {
  ul(e) && n.delete(t);
}
function bf() {
  Za = false, Qt !== null && ul(Qt) && (Qt = null), Ht !== null && ul(Ht) && (Ht = null), Wt !== null && ul(Wt) && (Wt = null), kr.forEach(Mi), Sr.forEach(Mi);
}
function tr(e, t) {
  e.blockedOn === t && (e.blockedOn = null, Za || (Za = true, $e.unstable_scheduleCallback($e.unstable_NormalPriority, bf)));
}
function Cr(e) {
  function t(a) {
    return tr(a, e);
  }
  if (0 < qr.length) {
    tr(qr[0], e);
    for (var n = 1; n < qr.length; n++) {
      var r = qr[n];
      r.blockedOn === e && (r.blockedOn = null);
    }
  }
  for (Qt !== null && tr(Qt, e), Ht !== null && tr(Ht, e), Wt !== null && tr(Wt, e), kr.forEach(t), Sr.forEach(t), n = 0; n < Mt.length; n++) r = Mt[n], r.blockedOn === e && (r.blockedOn = null);
  for (; 0 < Mt.length && (n = Mt[0], n.blockedOn === null); ) Eu(n), n.blockedOn === null && Mt.shift();
}
var Fn = Ot.ReactCurrentBatchConfig, Sl = true;
function jf(e, t, n, r) {
  var a = W, s = Fn.transition;
  Fn.transition = null;
  try {
    W = 1, As(e, t, n, r);
  } finally {
    W = a, Fn.transition = s;
  }
}
function wf(e, t, n, r) {
  var a = W, s = Fn.transition;
  Fn.transition = null;
  try {
    W = 4, As(e, t, n, r);
  } finally {
    W = a, Fn.transition = s;
  }
}
function As(e, t, n, r) {
  if (Sl) {
    var a = es(e, t, n, r);
    if (a === null) ka(e, t, r, Cl, n), $i(e, r);
    else if (xf(a, e, t, n, r)) r.stopPropagation();
    else if ($i(e, r), t & 4 && -1 < yf.indexOf(e)) {
      for (; a !== null; ) {
        var s = Dr(a);
        if (s !== null && ku(s), s = es(e, t, n, r), s === null && ka(e, t, r, Cl, n), s === a) break;
        a = s;
      }
      a !== null && r.stopPropagation();
    } else ka(e, t, r, null, n);
  }
}
var Cl = null;
function es(e, t, n, r) {
  if (Cl = null, e = Us(r), e = sn(e), e !== null) if (t = xn(e), t === null) e = null;
  else if (n = t.tag, n === 13) {
    if (e = mu(t), e !== null) return e;
    e = null;
  } else if (n === 3) {
    if (t.stateNode.current.memoizedState.isDehydrated) return t.tag === 3 ? t.stateNode.containerInfo : null;
    e = null;
  } else t !== e && (e = null);
  return Cl = e, null;
}
function Pu(e) {
  switch (e) {
    case "cancel":
    case "click":
    case "close":
    case "contextmenu":
    case "copy":
    case "cut":
    case "auxclick":
    case "dblclick":
    case "dragend":
    case "dragstart":
    case "drop":
    case "focusin":
    case "focusout":
    case "input":
    case "invalid":
    case "keydown":
    case "keypress":
    case "keyup":
    case "mousedown":
    case "mouseup":
    case "paste":
    case "pause":
    case "play":
    case "pointercancel":
    case "pointerdown":
    case "pointerup":
    case "ratechange":
    case "reset":
    case "resize":
    case "seeked":
    case "submit":
    case "touchcancel":
    case "touchend":
    case "touchstart":
    case "volumechange":
    case "change":
    case "selectionchange":
    case "textInput":
    case "compositionstart":
    case "compositionend":
    case "compositionupdate":
    case "beforeblur":
    case "afterblur":
    case "beforeinput":
    case "blur":
    case "fullscreenchange":
    case "focus":
    case "hashchange":
    case "popstate":
    case "select":
    case "selectstart":
      return 1;
    case "drag":
    case "dragenter":
    case "dragexit":
    case "dragleave":
    case "dragover":
    case "mousemove":
    case "mouseout":
    case "mouseover":
    case "pointermove":
    case "pointerout":
    case "pointerover":
    case "scroll":
    case "toggle":
    case "touchmove":
    case "wheel":
    case "mouseenter":
    case "mouseleave":
    case "pointerenter":
    case "pointerleave":
      return 4;
    case "message":
      switch (uf()) {
        case $s:
          return 1;
        case xu:
          return 4;
        case wl:
        case cf:
          return 16;
        case bu:
          return 536870912;
        default:
          return 16;
      }
    default:
      return 16;
  }
}
var At = null, Bs = null, cl = null;
function _u() {
  if (cl) return cl;
  var e, t = Bs, n = t.length, r, a = "value" in At ? At.value : At.textContent, s = a.length;
  for (e = 0; e < n && t[e] === a[e]; e++) ;
  var i = n - e;
  for (r = 1; r <= i && t[n - r] === a[s - r]; r++) ;
  return cl = a.slice(e, 1 < r ? 1 - r : void 0);
}
function dl(e) {
  var t = e.keyCode;
  return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
}
function Gr() {
  return true;
}
function Di() {
  return false;
}
function De(e) {
  function t(n, r, a, s, i) {
    this._reactName = n, this._targetInst = a, this.type = r, this.nativeEvent = s, this.target = i, this.currentTarget = null;
    for (var o in e) e.hasOwnProperty(o) && (n = e[o], this[o] = n ? n(s) : s[o]);
    return this.isDefaultPrevented = (s.defaultPrevented != null ? s.defaultPrevented : s.returnValue === false) ? Gr : Di, this.isPropagationStopped = Di, this;
  }
  return te(t.prototype, { preventDefault: function() {
    this.defaultPrevented = true;
    var n = this.nativeEvent;
    n && (n.preventDefault ? n.preventDefault() : typeof n.returnValue != "unknown" && (n.returnValue = false), this.isDefaultPrevented = Gr);
  }, stopPropagation: function() {
    var n = this.nativeEvent;
    n && (n.stopPropagation ? n.stopPropagation() : typeof n.cancelBubble != "unknown" && (n.cancelBubble = true), this.isPropagationStopped = Gr);
  }, persist: function() {
  }, isPersistent: Gr }), t;
}
var qn = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(e) {
  return e.timeStamp || Date.now();
}, defaultPrevented: 0, isTrusted: 0 }, Qs = De(qn), Mr = te({}, qn, { view: 0, detail: 0 }), kf = De(Mr), ha, ma, nr, ql = te({}, Mr, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: Hs, button: 0, buttons: 0, relatedTarget: function(e) {
  return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
}, movementX: function(e) {
  return "movementX" in e ? e.movementX : (e !== nr && (nr && e.type === "mousemove" ? (ha = e.screenX - nr.screenX, ma = e.screenY - nr.screenY) : ma = ha = 0, nr = e), ha);
}, movementY: function(e) {
  return "movementY" in e ? e.movementY : ma;
} }), Ai = De(ql), Sf = te({}, ql, { dataTransfer: 0 }), Cf = De(Sf), Nf = te({}, Mr, { relatedTarget: 0 }), ga = De(Nf), Ef = te({}, qn, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), Pf = De(Ef), _f = te({}, qn, { clipboardData: function(e) {
  return "clipboardData" in e ? e.clipboardData : window.clipboardData;
} }), Tf = De(_f), If = te({}, qn, { data: 0 }), Bi = De(If), Lf = { Esc: "Escape", Spacebar: " ", Left: "ArrowLeft", Up: "ArrowUp", Right: "ArrowRight", Down: "ArrowDown", Del: "Delete", Win: "OS", Menu: "ContextMenu", Apps: "ContextMenu", Scroll: "ScrollLock", MozPrintableKey: "Unidentified" }, Of = { 8: "Backspace", 9: "Tab", 12: "Clear", 13: "Enter", 16: "Shift", 17: "Control", 18: "Alt", 19: "Pause", 20: "CapsLock", 27: "Escape", 32: " ", 33: "PageUp", 34: "PageDown", 35: "End", 36: "Home", 37: "ArrowLeft", 38: "ArrowUp", 39: "ArrowRight", 40: "ArrowDown", 45: "Insert", 46: "Delete", 112: "F1", 113: "F2", 114: "F3", 115: "F4", 116: "F5", 117: "F6", 118: "F7", 119: "F8", 120: "F9", 121: "F10", 122: "F11", 123: "F12", 144: "NumLock", 145: "ScrollLock", 224: "Meta" }, Rf = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
function zf(e) {
  var t = this.nativeEvent;
  return t.getModifierState ? t.getModifierState(e) : (e = Rf[e]) ? !!t[e] : false;
}
function Hs() {
  return zf;
}
var Ff = te({}, Mr, { key: function(e) {
  if (e.key) {
    var t = Lf[e.key] || e.key;
    if (t !== "Unidentified") return t;
  }
  return e.type === "keypress" ? (e = dl(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? Of[e.keyCode] || "Unidentified" : "";
}, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: Hs, charCode: function(e) {
  return e.type === "keypress" ? dl(e) : 0;
}, keyCode: function(e) {
  return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
}, which: function(e) {
  return e.type === "keypress" ? dl(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
} }), Uf = De(Ff), $f = te({}, ql, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), Qi = De($f), Mf = te({}, Mr, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: Hs }), Df = De(Mf), Af = te({}, qn, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), Bf = De(Af), Qf = te({}, ql, { deltaX: function(e) {
  return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
}, deltaY: function(e) {
  return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
}, deltaZ: 0, deltaMode: 0 }), Hf = De(Qf), Wf = [9, 13, 27, 32], Ws = bt && "CompositionEvent" in window, fr = null;
bt && "documentMode" in document && (fr = document.documentMode);
var Vf = bt && "TextEvent" in window && !fr, Tu = bt && (!Ws || fr && 8 < fr && 11 >= fr), Hi = " ", Wi = false;
function Iu(e, t) {
  switch (e) {
    case "keyup":
      return Wf.indexOf(t.keyCode) !== -1;
    case "keydown":
      return t.keyCode !== 229;
    case "keypress":
    case "mousedown":
    case "focusout":
      return true;
    default:
      return false;
  }
}
function Lu(e) {
  return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
}
var kn = false;
function Kf(e, t) {
  switch (e) {
    case "compositionend":
      return Lu(t);
    case "keypress":
      return t.which !== 32 ? null : (Wi = true, Hi);
    case "textInput":
      return e = t.data, e === Hi && Wi ? null : e;
    default:
      return null;
  }
}
function qf(e, t) {
  if (kn) return e === "compositionend" || !Ws && Iu(e, t) ? (e = _u(), cl = Bs = At = null, kn = false, e) : null;
  switch (e) {
    case "paste":
      return null;
    case "keypress":
      if (!(t.ctrlKey || t.altKey || t.metaKey) || t.ctrlKey && t.altKey) {
        if (t.char && 1 < t.char.length) return t.char;
        if (t.which) return String.fromCharCode(t.which);
      }
      return null;
    case "compositionend":
      return Tu && t.locale !== "ko" ? null : t.data;
    default:
      return null;
  }
}
var Gf = { color: true, date: true, datetime: true, "datetime-local": true, email: true, month: true, number: true, password: true, range: true, search: true, tel: true, text: true, time: true, url: true, week: true };
function Vi(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return t === "input" ? !!Gf[e.type] : t === "textarea";
}
function Ou(e, t, n, r) {
  cu(r), t = Nl(t, "onChange"), 0 < t.length && (n = new Qs("onChange", "change", null, n, r), e.push({ event: n, listeners: t }));
}
var pr = null, Nr = null;
function Yf(e) {
  Hu(e, 0);
}
function Gl(e) {
  var t = Nn(e);
  if (ru(t)) return e;
}
function Xf(e, t) {
  if (e === "change") return t;
}
var Ru = false;
if (bt) {
  var va;
  if (bt) {
    var ya = "oninput" in document;
    if (!ya) {
      var Ki = document.createElement("div");
      Ki.setAttribute("oninput", "return;"), ya = typeof Ki.oninput == "function";
    }
    va = ya;
  } else va = false;
  Ru = va && (!document.documentMode || 9 < document.documentMode);
}
function qi() {
  pr && (pr.detachEvent("onpropertychange", zu), Nr = pr = null);
}
function zu(e) {
  if (e.propertyName === "value" && Gl(Nr)) {
    var t = [];
    Ou(t, Nr, e, Us(e)), hu(Yf, t);
  }
}
function Jf(e, t, n) {
  e === "focusin" ? (qi(), pr = t, Nr = n, pr.attachEvent("onpropertychange", zu)) : e === "focusout" && qi();
}
function Zf(e) {
  if (e === "selectionchange" || e === "keyup" || e === "keydown") return Gl(Nr);
}
function ep(e, t) {
  if (e === "click") return Gl(t);
}
function tp(e, t) {
  if (e === "input" || e === "change") return Gl(t);
}
function np(e, t) {
  return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
}
var rt = typeof Object.is == "function" ? Object.is : np;
function Er(e, t) {
  if (rt(e, t)) return true;
  if (typeof e != "object" || e === null || typeof t != "object" || t === null) return false;
  var n = Object.keys(e), r = Object.keys(t);
  if (n.length !== r.length) return false;
  for (r = 0; r < n.length; r++) {
    var a = n[r];
    if (!Fa.call(t, a) || !rt(e[a], t[a])) return false;
  }
  return true;
}
function Gi(e) {
  for (; e && e.firstChild; ) e = e.firstChild;
  return e;
}
function Yi(e, t) {
  var n = Gi(e);
  e = 0;
  for (var r; n; ) {
    if (n.nodeType === 3) {
      if (r = e + n.textContent.length, e <= t && r >= t) return { node: n, offset: t - e };
      e = r;
    }
    e: {
      for (; n; ) {
        if (n.nextSibling) {
          n = n.nextSibling;
          break e;
        }
        n = n.parentNode;
      }
      n = void 0;
    }
    n = Gi(n);
  }
}
function Fu(e, t) {
  return e && t ? e === t ? true : e && e.nodeType === 3 ? false : t && t.nodeType === 3 ? Fu(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : false : false;
}
function Uu() {
  for (var e = window, t = xl(); t instanceof e.HTMLIFrameElement; ) {
    try {
      var n = typeof t.contentWindow.location.href == "string";
    } catch {
      n = false;
    }
    if (n) e = t.contentWindow;
    else break;
    t = xl(e.document);
  }
  return t;
}
function Vs(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
}
function rp(e) {
  var t = Uu(), n = e.focusedElem, r = e.selectionRange;
  if (t !== n && n && n.ownerDocument && Fu(n.ownerDocument.documentElement, n)) {
    if (r !== null && Vs(n)) {
      if (t = r.start, e = r.end, e === void 0 && (e = t), "selectionStart" in n) n.selectionStart = t, n.selectionEnd = Math.min(e, n.value.length);
      else if (e = (t = n.ownerDocument || document) && t.defaultView || window, e.getSelection) {
        e = e.getSelection();
        var a = n.textContent.length, s = Math.min(r.start, a);
        r = r.end === void 0 ? s : Math.min(r.end, a), !e.extend && s > r && (a = r, r = s, s = a), a = Yi(n, s);
        var i = Yi(n, r);
        a && i && (e.rangeCount !== 1 || e.anchorNode !== a.node || e.anchorOffset !== a.offset || e.focusNode !== i.node || e.focusOffset !== i.offset) && (t = t.createRange(), t.setStart(a.node, a.offset), e.removeAllRanges(), s > r ? (e.addRange(t), e.extend(i.node, i.offset)) : (t.setEnd(i.node, i.offset), e.addRange(t)));
      }
    }
    for (t = [], e = n; e = e.parentNode; ) e.nodeType === 1 && t.push({ element: e, left: e.scrollLeft, top: e.scrollTop });
    for (typeof n.focus == "function" && n.focus(), n = 0; n < t.length; n++) e = t[n], e.element.scrollLeft = e.left, e.element.scrollTop = e.top;
  }
}
var lp = bt && "documentMode" in document && 11 >= document.documentMode, Sn = null, ts = null, hr = null, ns = false;
function Xi(e, t, n) {
  var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
  ns || Sn == null || Sn !== xl(r) || (r = Sn, "selectionStart" in r && Vs(r) ? r = { start: r.selectionStart, end: r.selectionEnd } : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(), r = { anchorNode: r.anchorNode, anchorOffset: r.anchorOffset, focusNode: r.focusNode, focusOffset: r.focusOffset }), hr && Er(hr, r) || (hr = r, r = Nl(ts, "onSelect"), 0 < r.length && (t = new Qs("onSelect", "select", null, t, n), e.push({ event: t, listeners: r }), t.target = Sn)));
}
function Yr(e, t) {
  var n = {};
  return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n;
}
var Cn = { animationend: Yr("Animation", "AnimationEnd"), animationiteration: Yr("Animation", "AnimationIteration"), animationstart: Yr("Animation", "AnimationStart"), transitionend: Yr("Transition", "TransitionEnd") }, xa = {}, $u = {};
bt && ($u = document.createElement("div").style, "AnimationEvent" in window || (delete Cn.animationend.animation, delete Cn.animationiteration.animation, delete Cn.animationstart.animation), "TransitionEvent" in window || delete Cn.transitionend.transition);
function Yl(e) {
  if (xa[e]) return xa[e];
  if (!Cn[e]) return e;
  var t = Cn[e], n;
  for (n in t) if (t.hasOwnProperty(n) && n in $u) return xa[e] = t[n];
  return e;
}
var Mu = Yl("animationend"), Du = Yl("animationiteration"), Au = Yl("animationstart"), Bu = Yl("transitionend"), Qu = /* @__PURE__ */ new Map(), Ji = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
function Zt(e, t) {
  Qu.set(e, t), yn(t, [e]);
}
for (var ba = 0; ba < Ji.length; ba++) {
  var ja = Ji[ba], ap = ja.toLowerCase(), sp = ja[0].toUpperCase() + ja.slice(1);
  Zt(ap, "on" + sp);
}
Zt(Mu, "onAnimationEnd");
Zt(Du, "onAnimationIteration");
Zt(Au, "onAnimationStart");
Zt("dblclick", "onDoubleClick");
Zt("focusin", "onFocus");
Zt("focusout", "onBlur");
Zt(Bu, "onTransitionEnd");
Dn("onMouseEnter", ["mouseout", "mouseover"]);
Dn("onMouseLeave", ["mouseout", "mouseover"]);
Dn("onPointerEnter", ["pointerout", "pointerover"]);
Dn("onPointerLeave", ["pointerout", "pointerover"]);
yn("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" "));
yn("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));
yn("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
yn("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" "));
yn("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" "));
yn("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
var ur = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), ip = new Set("cancel close invalid load scroll toggle".split(" ").concat(ur));
function Zi(e, t, n) {
  var r = e.type || "unknown-event";
  e.currentTarget = n, lf(r, t, void 0, e), e.currentTarget = null;
}
function Hu(e, t) {
  t = (t & 4) !== 0;
  for (var n = 0; n < e.length; n++) {
    var r = e[n], a = r.event;
    r = r.listeners;
    e: {
      var s = void 0;
      if (t) for (var i = r.length - 1; 0 <= i; i--) {
        var o = r[i], u = o.instance, f = o.currentTarget;
        if (o = o.listener, u !== s && a.isPropagationStopped()) break e;
        Zi(a, o, f), s = u;
      }
      else for (i = 0; i < r.length; i++) {
        if (o = r[i], u = o.instance, f = o.currentTarget, o = o.listener, u !== s && a.isPropagationStopped()) break e;
        Zi(a, o, f), s = u;
      }
    }
  }
  if (jl) throw e = Xa, jl = false, Xa = null, e;
}
function Y(e, t) {
  var n = t[is];
  n === void 0 && (n = t[is] = /* @__PURE__ */ new Set());
  var r = e + "__bubble";
  n.has(r) || (Wu(t, e, 2, false), n.add(r));
}
function wa(e, t, n) {
  var r = 0;
  t && (r |= 4), Wu(n, e, r, t);
}
var Xr = "_reactListening" + Math.random().toString(36).slice(2);
function Pr(e) {
  if (!e[Xr]) {
    e[Xr] = true, Jo.forEach(function(n) {
      n !== "selectionchange" && (ip.has(n) || wa(n, false, e), wa(n, true, e));
    });
    var t = e.nodeType === 9 ? e : e.ownerDocument;
    t === null || t[Xr] || (t[Xr] = true, wa("selectionchange", false, t));
  }
}
function Wu(e, t, n, r) {
  switch (Pu(t)) {
    case 1:
      var a = jf;
      break;
    case 4:
      a = wf;
      break;
    default:
      a = As;
  }
  n = a.bind(null, t, n, e), a = void 0, !Ya || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (a = true), r ? a !== void 0 ? e.addEventListener(t, n, { capture: true, passive: a }) : e.addEventListener(t, n, true) : a !== void 0 ? e.addEventListener(t, n, { passive: a }) : e.addEventListener(t, n, false);
}
function ka(e, t, n, r, a) {
  var s = r;
  if (!(t & 1) && !(t & 2) && r !== null) e: for (; ; ) {
    if (r === null) return;
    var i = r.tag;
    if (i === 3 || i === 4) {
      var o = r.stateNode.containerInfo;
      if (o === a || o.nodeType === 8 && o.parentNode === a) break;
      if (i === 4) for (i = r.return; i !== null; ) {
        var u = i.tag;
        if ((u === 3 || u === 4) && (u = i.stateNode.containerInfo, u === a || u.nodeType === 8 && u.parentNode === a)) return;
        i = i.return;
      }
      for (; o !== null; ) {
        if (i = sn(o), i === null) return;
        if (u = i.tag, u === 5 || u === 6) {
          r = s = i;
          continue e;
        }
        o = o.parentNode;
      }
    }
    r = r.return;
  }
  hu(function() {
    var f = s, v = Us(n), p = [];
    e: {
      var g = Qu.get(e);
      if (g !== void 0) {
        var m = Qs, x = e;
        switch (e) {
          case "keypress":
            if (dl(n) === 0) break e;
          case "keydown":
          case "keyup":
            m = Uf;
            break;
          case "focusin":
            x = "focus", m = ga;
            break;
          case "focusout":
            x = "blur", m = ga;
            break;
          case "beforeblur":
          case "afterblur":
            m = ga;
            break;
          case "click":
            if (n.button === 2) break e;
          case "auxclick":
          case "dblclick":
          case "mousedown":
          case "mousemove":
          case "mouseup":
          case "mouseout":
          case "mouseover":
          case "contextmenu":
            m = Ai;
            break;
          case "drag":
          case "dragend":
          case "dragenter":
          case "dragexit":
          case "dragleave":
          case "dragover":
          case "dragstart":
          case "drop":
            m = Cf;
            break;
          case "touchcancel":
          case "touchend":
          case "touchmove":
          case "touchstart":
            m = Df;
            break;
          case Mu:
          case Du:
          case Au:
            m = Pf;
            break;
          case Bu:
            m = Bf;
            break;
          case "scroll":
            m = kf;
            break;
          case "wheel":
            m = Hf;
            break;
          case "copy":
          case "cut":
          case "paste":
            m = Tf;
            break;
          case "gotpointercapture":
          case "lostpointercapture":
          case "pointercancel":
          case "pointerdown":
          case "pointermove":
          case "pointerout":
          case "pointerover":
          case "pointerup":
            m = Qi;
        }
        var y = (t & 4) !== 0, L = !y && e === "scroll", c = y ? g !== null ? g + "Capture" : null : g;
        y = [];
        for (var d = f, h; d !== null; ) {
          h = d;
          var b = h.stateNode;
          if (h.tag === 5 && b !== null && (h = b, c !== null && (b = wr(d, c), b != null && y.push(_r(d, b, h)))), L) break;
          d = d.return;
        }
        0 < y.length && (g = new m(g, x, null, n, v), p.push({ event: g, listeners: y }));
      }
    }
    if (!(t & 7)) {
      e: {
        if (g = e === "mouseover" || e === "pointerover", m = e === "mouseout" || e === "pointerout", g && n !== qa && (x = n.relatedTarget || n.fromElement) && (sn(x) || x[jt])) break e;
        if ((m || g) && (g = v.window === v ? v : (g = v.ownerDocument) ? g.defaultView || g.parentWindow : window, m ? (x = n.relatedTarget || n.toElement, m = f, x = x ? sn(x) : null, x !== null && (L = xn(x), x !== L || x.tag !== 5 && x.tag !== 6) && (x = null)) : (m = null, x = f), m !== x)) {
          if (y = Ai, b = "onMouseLeave", c = "onMouseEnter", d = "mouse", (e === "pointerout" || e === "pointerover") && (y = Qi, b = "onPointerLeave", c = "onPointerEnter", d = "pointer"), L = m == null ? g : Nn(m), h = x == null ? g : Nn(x), g = new y(b, d + "leave", m, n, v), g.target = L, g.relatedTarget = h, b = null, sn(v) === f && (y = new y(c, d + "enter", x, n, v), y.target = h, y.relatedTarget = L, b = y), L = b, m && x) t: {
            for (y = m, c = x, d = 0, h = y; h; h = bn(h)) d++;
            for (h = 0, b = c; b; b = bn(b)) h++;
            for (; 0 < d - h; ) y = bn(y), d--;
            for (; 0 < h - d; ) c = bn(c), h--;
            for (; d--; ) {
              if (y === c || c !== null && y === c.alternate) break t;
              y = bn(y), c = bn(c);
            }
            y = null;
          }
          else y = null;
          m !== null && eo(p, g, m, y, false), x !== null && L !== null && eo(p, L, x, y, true);
        }
      }
      e: {
        if (g = f ? Nn(f) : window, m = g.nodeName && g.nodeName.toLowerCase(), m === "select" || m === "input" && g.type === "file") var S = Xf;
        else if (Vi(g)) if (Ru) S = tp;
        else {
          S = Zf;
          var N = Jf;
        }
        else (m = g.nodeName) && m.toLowerCase() === "input" && (g.type === "checkbox" || g.type === "radio") && (S = ep);
        if (S && (S = S(e, f))) {
          Ou(p, S, n, v);
          break e;
        }
        N && N(e, g, f), e === "focusout" && (N = g._wrapperState) && N.controlled && g.type === "number" && Qa(g, "number", g.value);
      }
      switch (N = f ? Nn(f) : window, e) {
        case "focusin":
          (Vi(N) || N.contentEditable === "true") && (Sn = N, ts = f, hr = null);
          break;
        case "focusout":
          hr = ts = Sn = null;
          break;
        case "mousedown":
          ns = true;
          break;
        case "contextmenu":
        case "mouseup":
        case "dragend":
          ns = false, Xi(p, n, v);
          break;
        case "selectionchange":
          if (lp) break;
        case "keydown":
        case "keyup":
          Xi(p, n, v);
      }
      var P;
      if (Ws) e: {
        switch (e) {
          case "compositionstart":
            var k = "onCompositionStart";
            break e;
          case "compositionend":
            k = "onCompositionEnd";
            break e;
          case "compositionupdate":
            k = "onCompositionUpdate";
            break e;
        }
        k = void 0;
      }
      else kn ? Iu(e, n) && (k = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (k = "onCompositionStart");
      k && (Tu && n.locale !== "ko" && (kn || k !== "onCompositionStart" ? k === "onCompositionEnd" && kn && (P = _u()) : (At = v, Bs = "value" in At ? At.value : At.textContent, kn = true)), N = Nl(f, k), 0 < N.length && (k = new Bi(k, e, null, n, v), p.push({ event: k, listeners: N }), P ? k.data = P : (P = Lu(n), P !== null && (k.data = P)))), (P = Vf ? Kf(e, n) : qf(e, n)) && (f = Nl(f, "onBeforeInput"), 0 < f.length && (v = new Bi("onBeforeInput", "beforeinput", null, n, v), p.push({ event: v, listeners: f }), v.data = P));
    }
    Hu(p, t);
  });
}
function _r(e, t, n) {
  return { instance: e, listener: t, currentTarget: n };
}
function Nl(e, t) {
  for (var n = t + "Capture", r = []; e !== null; ) {
    var a = e, s = a.stateNode;
    a.tag === 5 && s !== null && (a = s, s = wr(e, n), s != null && r.unshift(_r(e, s, a)), s = wr(e, t), s != null && r.push(_r(e, s, a))), e = e.return;
  }
  return r;
}
function bn(e) {
  if (e === null) return null;
  do
    e = e.return;
  while (e && e.tag !== 5);
  return e || null;
}
function eo(e, t, n, r, a) {
  for (var s = t._reactName, i = []; n !== null && n !== r; ) {
    var o = n, u = o.alternate, f = o.stateNode;
    if (u !== null && u === r) break;
    o.tag === 5 && f !== null && (o = f, a ? (u = wr(n, s), u != null && i.unshift(_r(n, u, o))) : a || (u = wr(n, s), u != null && i.push(_r(n, u, o)))), n = n.return;
  }
  i.length !== 0 && e.push({ event: t, listeners: i });
}
var op = /\r\n?/g, up = /\u0000|\uFFFD/g;
function to(e) {
  return (typeof e == "string" ? e : "" + e).replace(op, `
`).replace(up, "");
}
function Jr(e, t, n) {
  if (t = to(t), to(e) !== t && n) throw Error(w(425));
}
function El() {
}
var rs = null, ls = null;
function as(e, t) {
  return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
}
var ss = typeof setTimeout == "function" ? setTimeout : void 0, cp = typeof clearTimeout == "function" ? clearTimeout : void 0, no = typeof Promise == "function" ? Promise : void 0, dp = typeof queueMicrotask == "function" ? queueMicrotask : typeof no < "u" ? function(e) {
  return no.resolve(null).then(e).catch(fp);
} : ss;
function fp(e) {
  setTimeout(function() {
    throw e;
  });
}
function Sa(e, t) {
  var n = t, r = 0;
  do {
    var a = n.nextSibling;
    if (e.removeChild(n), a && a.nodeType === 8) if (n = a.data, n === "/$") {
      if (r === 0) {
        e.removeChild(a), Cr(t);
        return;
      }
      r--;
    } else n !== "$" && n !== "$?" && n !== "$!" || r++;
    n = a;
  } while (n);
  Cr(t);
}
function Vt(e) {
  for (; e != null; e = e.nextSibling) {
    var t = e.nodeType;
    if (t === 1 || t === 3) break;
    if (t === 8) {
      if (t = e.data, t === "$" || t === "$!" || t === "$?") break;
      if (t === "/$") return null;
    }
  }
  return e;
}
function ro(e) {
  e = e.previousSibling;
  for (var t = 0; e; ) {
    if (e.nodeType === 8) {
      var n = e.data;
      if (n === "$" || n === "$!" || n === "$?") {
        if (t === 0) return e;
        t--;
      } else n === "/$" && t++;
    }
    e = e.previousSibling;
  }
  return null;
}
var Gn = Math.random().toString(36).slice(2), ot = "__reactFiber$" + Gn, Tr = "__reactProps$" + Gn, jt = "__reactContainer$" + Gn, is = "__reactEvents$" + Gn, pp = "__reactListeners$" + Gn, hp = "__reactHandles$" + Gn;
function sn(e) {
  var t = e[ot];
  if (t) return t;
  for (var n = e.parentNode; n; ) {
    if (t = n[jt] || n[ot]) {
      if (n = t.alternate, t.child !== null || n !== null && n.child !== null) for (e = ro(e); e !== null; ) {
        if (n = e[ot]) return n;
        e = ro(e);
      }
      return t;
    }
    e = n, n = e.parentNode;
  }
  return null;
}
function Dr(e) {
  return e = e[ot] || e[jt], !e || e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3 ? null : e;
}
function Nn(e) {
  if (e.tag === 5 || e.tag === 6) return e.stateNode;
  throw Error(w(33));
}
function Xl(e) {
  return e[Tr] || null;
}
var os = [], En = -1;
function en(e) {
  return { current: e };
}
function X(e) {
  0 > En || (e.current = os[En], os[En] = null, En--);
}
function q(e, t) {
  En++, os[En] = e.current, e.current = t;
}
var Jt = {}, be = en(Jt), Ie = en(false), pn = Jt;
function An(e, t) {
  var n = e.type.contextTypes;
  if (!n) return Jt;
  var r = e.stateNode;
  if (r && r.__reactInternalMemoizedUnmaskedChildContext === t) return r.__reactInternalMemoizedMaskedChildContext;
  var a = {}, s;
  for (s in n) a[s] = t[s];
  return r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = t, e.__reactInternalMemoizedMaskedChildContext = a), a;
}
function Le(e) {
  return e = e.childContextTypes, e != null;
}
function Pl() {
  X(Ie), X(be);
}
function lo(e, t, n) {
  if (be.current !== Jt) throw Error(w(168));
  q(be, t), q(Ie, n);
}
function Vu(e, t, n) {
  var r = e.stateNode;
  if (t = t.childContextTypes, typeof r.getChildContext != "function") return n;
  r = r.getChildContext();
  for (var a in r) if (!(a in t)) throw Error(w(108, Xd(e) || "Unknown", a));
  return te({}, n, r);
}
function _l(e) {
  return e = (e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext || Jt, pn = be.current, q(be, e), q(Ie, Ie.current), true;
}
function ao(e, t, n) {
  var r = e.stateNode;
  if (!r) throw Error(w(169));
  n ? (e = Vu(e, t, pn), r.__reactInternalMemoizedMergedChildContext = e, X(Ie), X(be), q(be, e)) : X(Ie), q(Ie, n);
}
var mt = null, Jl = false, Ca = false;
function Ku(e) {
  mt === null ? mt = [e] : mt.push(e);
}
function mp(e) {
  Jl = true, Ku(e);
}
function tn() {
  if (!Ca && mt !== null) {
    Ca = true;
    var e = 0, t = W;
    try {
      var n = mt;
      for (W = 1; e < n.length; e++) {
        var r = n[e];
        do
          r = r(true);
        while (r !== null);
      }
      mt = null, Jl = false;
    } catch (a) {
      throw mt !== null && (mt = mt.slice(e + 1)), yu($s, tn), a;
    } finally {
      W = t, Ca = false;
    }
  }
  return null;
}
var Pn = [], _n = 0, Tl = null, Il = 0, Be = [], Qe = 0, hn = null, gt = 1, vt = "";
function ln(e, t) {
  Pn[_n++] = Il, Pn[_n++] = Tl, Tl = e, Il = t;
}
function qu(e, t, n) {
  Be[Qe++] = gt, Be[Qe++] = vt, Be[Qe++] = hn, hn = e;
  var r = gt;
  e = vt;
  var a = 32 - tt(r) - 1;
  r &= ~(1 << a), n += 1;
  var s = 32 - tt(t) + a;
  if (30 < s) {
    var i = a - a % 5;
    s = (r & (1 << i) - 1).toString(32), r >>= i, a -= i, gt = 1 << 32 - tt(t) + a | n << a | r, vt = s + e;
  } else gt = 1 << s | n << a | r, vt = e;
}
function Ks(e) {
  e.return !== null && (ln(e, 1), qu(e, 1, 0));
}
function qs(e) {
  for (; e === Tl; ) Tl = Pn[--_n], Pn[_n] = null, Il = Pn[--_n], Pn[_n] = null;
  for (; e === hn; ) hn = Be[--Qe], Be[Qe] = null, vt = Be[--Qe], Be[Qe] = null, gt = Be[--Qe], Be[Qe] = null;
}
var Ue = null, Fe = null, J = false, Ze = null;
function Gu(e, t) {
  var n = He(5, null, null, 0);
  n.elementType = "DELETED", n.stateNode = t, n.return = e, t = e.deletions, t === null ? (e.deletions = [n], e.flags |= 16) : t.push(n);
}
function so(e, t) {
  switch (e.tag) {
    case 5:
      var n = e.type;
      return t = t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase() ? null : t, t !== null ? (e.stateNode = t, Ue = e, Fe = Vt(t.firstChild), true) : false;
    case 6:
      return t = e.pendingProps === "" || t.nodeType !== 3 ? null : t, t !== null ? (e.stateNode = t, Ue = e, Fe = null, true) : false;
    case 13:
      return t = t.nodeType !== 8 ? null : t, t !== null ? (n = hn !== null ? { id: gt, overflow: vt } : null, e.memoizedState = { dehydrated: t, treeContext: n, retryLane: 1073741824 }, n = He(18, null, null, 0), n.stateNode = t, n.return = e, e.child = n, Ue = e, Fe = null, true) : false;
    default:
      return false;
  }
}
function us(e) {
  return (e.mode & 1) !== 0 && (e.flags & 128) === 0;
}
function cs(e) {
  if (J) {
    var t = Fe;
    if (t) {
      var n = t;
      if (!so(e, t)) {
        if (us(e)) throw Error(w(418));
        t = Vt(n.nextSibling);
        var r = Ue;
        t && so(e, t) ? Gu(r, n) : (e.flags = e.flags & -4097 | 2, J = false, Ue = e);
      }
    } else {
      if (us(e)) throw Error(w(418));
      e.flags = e.flags & -4097 | 2, J = false, Ue = e;
    }
  }
}
function io(e) {
  for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13; ) e = e.return;
  Ue = e;
}
function Zr(e) {
  if (e !== Ue) return false;
  if (!J) return io(e), J = true, false;
  var t;
  if ((t = e.tag !== 3) && !(t = e.tag !== 5) && (t = e.type, t = t !== "head" && t !== "body" && !as(e.type, e.memoizedProps)), t && (t = Fe)) {
    if (us(e)) throw Yu(), Error(w(418));
    for (; t; ) Gu(e, t), t = Vt(t.nextSibling);
  }
  if (io(e), e.tag === 13) {
    if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(w(317));
    e: {
      for (e = e.nextSibling, t = 0; e; ) {
        if (e.nodeType === 8) {
          var n = e.data;
          if (n === "/$") {
            if (t === 0) {
              Fe = Vt(e.nextSibling);
              break e;
            }
            t--;
          } else n !== "$" && n !== "$!" && n !== "$?" || t++;
        }
        e = e.nextSibling;
      }
      Fe = null;
    }
  } else Fe = Ue ? Vt(e.stateNode.nextSibling) : null;
  return true;
}
function Yu() {
  for (var e = Fe; e; ) e = Vt(e.nextSibling);
}
function Bn() {
  Fe = Ue = null, J = false;
}
function Gs(e) {
  Ze === null ? Ze = [e] : Ze.push(e);
}
var gp = Ot.ReactCurrentBatchConfig;
function rr(e, t, n) {
  if (e = n.ref, e !== null && typeof e != "function" && typeof e != "object") {
    if (n._owner) {
      if (n = n._owner, n) {
        if (n.tag !== 1) throw Error(w(309));
        var r = n.stateNode;
      }
      if (!r) throw Error(w(147, e));
      var a = r, s = "" + e;
      return t !== null && t.ref !== null && typeof t.ref == "function" && t.ref._stringRef === s ? t.ref : (t = function(i) {
        var o = a.refs;
        i === null ? delete o[s] : o[s] = i;
      }, t._stringRef = s, t);
    }
    if (typeof e != "string") throw Error(w(284));
    if (!n._owner) throw Error(w(290, e));
  }
  return e;
}
function el(e, t) {
  throw e = Object.prototype.toString.call(t), Error(w(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e));
}
function oo(e) {
  var t = e._init;
  return t(e._payload);
}
function Xu(e) {
  function t(c, d) {
    if (e) {
      var h = c.deletions;
      h === null ? (c.deletions = [d], c.flags |= 16) : h.push(d);
    }
  }
  function n(c, d) {
    if (!e) return null;
    for (; d !== null; ) t(c, d), d = d.sibling;
    return null;
  }
  function r(c, d) {
    for (c = /* @__PURE__ */ new Map(); d !== null; ) d.key !== null ? c.set(d.key, d) : c.set(d.index, d), d = d.sibling;
    return c;
  }
  function a(c, d) {
    return c = Yt(c, d), c.index = 0, c.sibling = null, c;
  }
  function s(c, d, h) {
    return c.index = h, e ? (h = c.alternate, h !== null ? (h = h.index, h < d ? (c.flags |= 2, d) : h) : (c.flags |= 2, d)) : (c.flags |= 1048576, d);
  }
  function i(c) {
    return e && c.alternate === null && (c.flags |= 2), c;
  }
  function o(c, d, h, b) {
    return d === null || d.tag !== 6 ? (d = La(h, c.mode, b), d.return = c, d) : (d = a(d, h), d.return = c, d);
  }
  function u(c, d, h, b) {
    var S = h.type;
    return S === wn ? v(c, d, h.props.children, b, h.key) : d !== null && (d.elementType === S || typeof S == "object" && S !== null && S.$$typeof === Ut && oo(S) === d.type) ? (b = a(d, h.props), b.ref = rr(c, d, h), b.return = c, b) : (b = yl(h.type, h.key, h.props, null, c.mode, b), b.ref = rr(c, d, h), b.return = c, b);
  }
  function f(c, d, h, b) {
    return d === null || d.tag !== 4 || d.stateNode.containerInfo !== h.containerInfo || d.stateNode.implementation !== h.implementation ? (d = Oa(h, c.mode, b), d.return = c, d) : (d = a(d, h.children || []), d.return = c, d);
  }
  function v(c, d, h, b, S) {
    return d === null || d.tag !== 7 ? (d = fn(h, c.mode, b, S), d.return = c, d) : (d = a(d, h), d.return = c, d);
  }
  function p(c, d, h) {
    if (typeof d == "string" && d !== "" || typeof d == "number") return d = La("" + d, c.mode, h), d.return = c, d;
    if (typeof d == "object" && d !== null) {
      switch (d.$$typeof) {
        case Qr:
          return h = yl(d.type, d.key, d.props, null, c.mode, h), h.ref = rr(c, null, d), h.return = c, h;
        case jn:
          return d = Oa(d, c.mode, h), d.return = c, d;
        case Ut:
          var b = d._init;
          return p(c, b(d._payload), h);
      }
      if (ir(d) || Jn(d)) return d = fn(d, c.mode, h, null), d.return = c, d;
      el(c, d);
    }
    return null;
  }
  function g(c, d, h, b) {
    var S = d !== null ? d.key : null;
    if (typeof h == "string" && h !== "" || typeof h == "number") return S !== null ? null : o(c, d, "" + h, b);
    if (typeof h == "object" && h !== null) {
      switch (h.$$typeof) {
        case Qr:
          return h.key === S ? u(c, d, h, b) : null;
        case jn:
          return h.key === S ? f(c, d, h, b) : null;
        case Ut:
          return S = h._init, g(c, d, S(h._payload), b);
      }
      if (ir(h) || Jn(h)) return S !== null ? null : v(c, d, h, b, null);
      el(c, h);
    }
    return null;
  }
  function m(c, d, h, b, S) {
    if (typeof b == "string" && b !== "" || typeof b == "number") return c = c.get(h) || null, o(d, c, "" + b, S);
    if (typeof b == "object" && b !== null) {
      switch (b.$$typeof) {
        case Qr:
          return c = c.get(b.key === null ? h : b.key) || null, u(d, c, b, S);
        case jn:
          return c = c.get(b.key === null ? h : b.key) || null, f(d, c, b, S);
        case Ut:
          var N = b._init;
          return m(c, d, h, N(b._payload), S);
      }
      if (ir(b) || Jn(b)) return c = c.get(h) || null, v(d, c, b, S, null);
      el(d, b);
    }
    return null;
  }
  function x(c, d, h, b) {
    for (var S = null, N = null, P = d, k = d = 0, V = null; P !== null && k < h.length; k++) {
      P.index > k ? (V = P, P = null) : V = P.sibling;
      var I = g(c, P, h[k], b);
      if (I === null) {
        P === null && (P = V);
        break;
      }
      e && P && I.alternate === null && t(c, P), d = s(I, d, k), N === null ? S = I : N.sibling = I, N = I, P = V;
    }
    if (k === h.length) return n(c, P), J && ln(c, k), S;
    if (P === null) {
      for (; k < h.length; k++) P = p(c, h[k], b), P !== null && (d = s(P, d, k), N === null ? S = P : N.sibling = P, N = P);
      return J && ln(c, k), S;
    }
    for (P = r(c, P); k < h.length; k++) V = m(P, c, k, h[k], b), V !== null && (e && V.alternate !== null && P.delete(V.key === null ? k : V.key), d = s(V, d, k), N === null ? S = V : N.sibling = V, N = V);
    return e && P.forEach(function(ce) {
      return t(c, ce);
    }), J && ln(c, k), S;
  }
  function y(c, d, h, b) {
    var S = Jn(h);
    if (typeof S != "function") throw Error(w(150));
    if (h = S.call(h), h == null) throw Error(w(151));
    for (var N = S = null, P = d, k = d = 0, V = null, I = h.next(); P !== null && !I.done; k++, I = h.next()) {
      P.index > k ? (V = P, P = null) : V = P.sibling;
      var ce = g(c, P, I.value, b);
      if (ce === null) {
        P === null && (P = V);
        break;
      }
      e && P && ce.alternate === null && t(c, P), d = s(ce, d, k), N === null ? S = ce : N.sibling = ce, N = ce, P = V;
    }
    if (I.done) return n(c, P), J && ln(c, k), S;
    if (P === null) {
      for (; !I.done; k++, I = h.next()) I = p(c, I.value, b), I !== null && (d = s(I, d, k), N === null ? S = I : N.sibling = I, N = I);
      return J && ln(c, k), S;
    }
    for (P = r(c, P); !I.done; k++, I = h.next()) I = m(P, c, k, I.value, b), I !== null && (e && I.alternate !== null && P.delete(I.key === null ? k : I.key), d = s(I, d, k), N === null ? S = I : N.sibling = I, N = I);
    return e && P.forEach(function($) {
      return t(c, $);
    }), J && ln(c, k), S;
  }
  function L(c, d, h, b) {
    if (typeof h == "object" && h !== null && h.type === wn && h.key === null && (h = h.props.children), typeof h == "object" && h !== null) {
      switch (h.$$typeof) {
        case Qr:
          e: {
            for (var S = h.key, N = d; N !== null; ) {
              if (N.key === S) {
                if (S = h.type, S === wn) {
                  if (N.tag === 7) {
                    n(c, N.sibling), d = a(N, h.props.children), d.return = c, c = d;
                    break e;
                  }
                } else if (N.elementType === S || typeof S == "object" && S !== null && S.$$typeof === Ut && oo(S) === N.type) {
                  n(c, N.sibling), d = a(N, h.props), d.ref = rr(c, N, h), d.return = c, c = d;
                  break e;
                }
                n(c, N);
                break;
              } else t(c, N);
              N = N.sibling;
            }
            h.type === wn ? (d = fn(h.props.children, c.mode, b, h.key), d.return = c, c = d) : (b = yl(h.type, h.key, h.props, null, c.mode, b), b.ref = rr(c, d, h), b.return = c, c = b);
          }
          return i(c);
        case jn:
          e: {
            for (N = h.key; d !== null; ) {
              if (d.key === N) if (d.tag === 4 && d.stateNode.containerInfo === h.containerInfo && d.stateNode.implementation === h.implementation) {
                n(c, d.sibling), d = a(d, h.children || []), d.return = c, c = d;
                break e;
              } else {
                n(c, d);
                break;
              }
              else t(c, d);
              d = d.sibling;
            }
            d = Oa(h, c.mode, b), d.return = c, c = d;
          }
          return i(c);
        case Ut:
          return N = h._init, L(c, d, N(h._payload), b);
      }
      if (ir(h)) return x(c, d, h, b);
      if (Jn(h)) return y(c, d, h, b);
      el(c, h);
    }
    return typeof h == "string" && h !== "" || typeof h == "number" ? (h = "" + h, d !== null && d.tag === 6 ? (n(c, d.sibling), d = a(d, h), d.return = c, c = d) : (n(c, d), d = La(h, c.mode, b), d.return = c, c = d), i(c)) : n(c, d);
  }
  return L;
}
var Qn = Xu(true), Ju = Xu(false), Ll = en(null), Ol = null, Tn = null, Ys = null;
function Xs() {
  Ys = Tn = Ol = null;
}
function Js(e) {
  var t = Ll.current;
  X(Ll), e._currentValue = t;
}
function ds(e, t, n) {
  for (; e !== null; ) {
    var r = e.alternate;
    if ((e.childLanes & t) !== t ? (e.childLanes |= t, r !== null && (r.childLanes |= t)) : r !== null && (r.childLanes & t) !== t && (r.childLanes |= t), e === n) break;
    e = e.return;
  }
}
function Un(e, t) {
  Ol = e, Ys = Tn = null, e = e.dependencies, e !== null && e.firstContext !== null && (e.lanes & t && (Te = true), e.firstContext = null);
}
function Ve(e) {
  var t = e._currentValue;
  if (Ys !== e) if (e = { context: e, memoizedValue: t, next: null }, Tn === null) {
    if (Ol === null) throw Error(w(308));
    Tn = e, Ol.dependencies = { lanes: 0, firstContext: e };
  } else Tn = Tn.next = e;
  return t;
}
var on = null;
function Zs(e) {
  on === null ? on = [e] : on.push(e);
}
function Zu(e, t, n, r) {
  var a = t.interleaved;
  return a === null ? (n.next = n, Zs(t)) : (n.next = a.next, a.next = n), t.interleaved = n, wt(e, r);
}
function wt(e, t) {
  e.lanes |= t;
  var n = e.alternate;
  for (n !== null && (n.lanes |= t), n = e, e = e.return; e !== null; ) e.childLanes |= t, n = e.alternate, n !== null && (n.childLanes |= t), n = e, e = e.return;
  return n.tag === 3 ? n.stateNode : null;
}
var $t = false;
function ei(e) {
  e.updateQueue = { baseState: e.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
}
function ec(e, t) {
  e = e.updateQueue, t.updateQueue === e && (t.updateQueue = { baseState: e.baseState, firstBaseUpdate: e.firstBaseUpdate, lastBaseUpdate: e.lastBaseUpdate, shared: e.shared, effects: e.effects });
}
function yt(e, t) {
  return { eventTime: e, lane: t, tag: 0, payload: null, callback: null, next: null };
}
function Kt(e, t, n) {
  var r = e.updateQueue;
  if (r === null) return null;
  if (r = r.shared, Q & 2) {
    var a = r.pending;
    return a === null ? t.next = t : (t.next = a.next, a.next = t), r.pending = t, wt(e, n);
  }
  return a = r.interleaved, a === null ? (t.next = t, Zs(r)) : (t.next = a.next, a.next = t), r.interleaved = t, wt(e, n);
}
function fl(e, t, n) {
  if (t = t.updateQueue, t !== null && (t = t.shared, (n & 4194240) !== 0)) {
    var r = t.lanes;
    r &= e.pendingLanes, n |= r, t.lanes = n, Ms(e, n);
  }
}
function uo(e, t) {
  var n = e.updateQueue, r = e.alternate;
  if (r !== null && (r = r.updateQueue, n === r)) {
    var a = null, s = null;
    if (n = n.firstBaseUpdate, n !== null) {
      do {
        var i = { eventTime: n.eventTime, lane: n.lane, tag: n.tag, payload: n.payload, callback: n.callback, next: null };
        s === null ? a = s = i : s = s.next = i, n = n.next;
      } while (n !== null);
      s === null ? a = s = t : s = s.next = t;
    } else a = s = t;
    n = { baseState: r.baseState, firstBaseUpdate: a, lastBaseUpdate: s, shared: r.shared, effects: r.effects }, e.updateQueue = n;
    return;
  }
  e = n.lastBaseUpdate, e === null ? n.firstBaseUpdate = t : e.next = t, n.lastBaseUpdate = t;
}
function Rl(e, t, n, r) {
  var a = e.updateQueue;
  $t = false;
  var s = a.firstBaseUpdate, i = a.lastBaseUpdate, o = a.shared.pending;
  if (o !== null) {
    a.shared.pending = null;
    var u = o, f = u.next;
    u.next = null, i === null ? s = f : i.next = f, i = u;
    var v = e.alternate;
    v !== null && (v = v.updateQueue, o = v.lastBaseUpdate, o !== i && (o === null ? v.firstBaseUpdate = f : o.next = f, v.lastBaseUpdate = u));
  }
  if (s !== null) {
    var p = a.baseState;
    i = 0, v = f = u = null, o = s;
    do {
      var g = o.lane, m = o.eventTime;
      if ((r & g) === g) {
        v !== null && (v = v.next = { eventTime: m, lane: 0, tag: o.tag, payload: o.payload, callback: o.callback, next: null });
        e: {
          var x = e, y = o;
          switch (g = t, m = n, y.tag) {
            case 1:
              if (x = y.payload, typeof x == "function") {
                p = x.call(m, p, g);
                break e;
              }
              p = x;
              break e;
            case 3:
              x.flags = x.flags & -65537 | 128;
            case 0:
              if (x = y.payload, g = typeof x == "function" ? x.call(m, p, g) : x, g == null) break e;
              p = te({}, p, g);
              break e;
            case 2:
              $t = true;
          }
        }
        o.callback !== null && o.lane !== 0 && (e.flags |= 64, g = a.effects, g === null ? a.effects = [o] : g.push(o));
      } else m = { eventTime: m, lane: g, tag: o.tag, payload: o.payload, callback: o.callback, next: null }, v === null ? (f = v = m, u = p) : v = v.next = m, i |= g;
      if (o = o.next, o === null) {
        if (o = a.shared.pending, o === null) break;
        g = o, o = g.next, g.next = null, a.lastBaseUpdate = g, a.shared.pending = null;
      }
    } while (true);
    if (v === null && (u = p), a.baseState = u, a.firstBaseUpdate = f, a.lastBaseUpdate = v, t = a.shared.interleaved, t !== null) {
      a = t;
      do
        i |= a.lane, a = a.next;
      while (a !== t);
    } else s === null && (a.shared.lanes = 0);
    gn |= i, e.lanes = i, e.memoizedState = p;
  }
}
function co(e, t, n) {
  if (e = t.effects, t.effects = null, e !== null) for (t = 0; t < e.length; t++) {
    var r = e[t], a = r.callback;
    if (a !== null) {
      if (r.callback = null, r = n, typeof a != "function") throw Error(w(191, a));
      a.call(r);
    }
  }
}
var Ar = {}, ct = en(Ar), Ir = en(Ar), Lr = en(Ar);
function un(e) {
  if (e === Ar) throw Error(w(174));
  return e;
}
function ti(e, t) {
  switch (q(Lr, t), q(Ir, e), q(ct, Ar), e = t.nodeType, e) {
    case 9:
    case 11:
      t = (t = t.documentElement) ? t.namespaceURI : Wa(null, "");
      break;
    default:
      e = e === 8 ? t.parentNode : t, t = e.namespaceURI || null, e = e.tagName, t = Wa(t, e);
  }
  X(ct), q(ct, t);
}
function Hn() {
  X(ct), X(Ir), X(Lr);
}
function tc(e) {
  un(Lr.current);
  var t = un(ct.current), n = Wa(t, e.type);
  t !== n && (q(Ir, e), q(ct, n));
}
function ni(e) {
  Ir.current === e && (X(ct), X(Ir));
}
var Z = en(0);
function zl(e) {
  for (var t = e; t !== null; ) {
    if (t.tag === 13) {
      var n = t.memoizedState;
      if (n !== null && (n = n.dehydrated, n === null || n.data === "$?" || n.data === "$!")) return t;
    } else if (t.tag === 19 && t.memoizedProps.revealOrder !== void 0) {
      if (t.flags & 128) return t;
    } else if (t.child !== null) {
      t.child.return = t, t = t.child;
      continue;
    }
    if (t === e) break;
    for (; t.sibling === null; ) {
      if (t.return === null || t.return === e) return null;
      t = t.return;
    }
    t.sibling.return = t.return, t = t.sibling;
  }
  return null;
}
var Na = [];
function ri() {
  for (var e = 0; e < Na.length; e++) Na[e]._workInProgressVersionPrimary = null;
  Na.length = 0;
}
var pl = Ot.ReactCurrentDispatcher, Ea = Ot.ReactCurrentBatchConfig, mn = 0, ee = null, oe = null, de = null, Fl = false, mr = false, Or = 0, vp = 0;
function ve() {
  throw Error(w(321));
}
function li(e, t) {
  if (t === null) return false;
  for (var n = 0; n < t.length && n < e.length; n++) if (!rt(e[n], t[n])) return false;
  return true;
}
function ai(e, t, n, r, a, s) {
  if (mn = s, ee = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, pl.current = e === null || e.memoizedState === null ? jp : wp, e = n(r, a), mr) {
    s = 0;
    do {
      if (mr = false, Or = 0, 25 <= s) throw Error(w(301));
      s += 1, de = oe = null, t.updateQueue = null, pl.current = kp, e = n(r, a);
    } while (mr);
  }
  if (pl.current = Ul, t = oe !== null && oe.next !== null, mn = 0, de = oe = ee = null, Fl = false, t) throw Error(w(300));
  return e;
}
function si() {
  var e = Or !== 0;
  return Or = 0, e;
}
function it() {
  var e = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
  return de === null ? ee.memoizedState = de = e : de = de.next = e, de;
}
function Ke() {
  if (oe === null) {
    var e = ee.alternate;
    e = e !== null ? e.memoizedState : null;
  } else e = oe.next;
  var t = de === null ? ee.memoizedState : de.next;
  if (t !== null) de = t, oe = e;
  else {
    if (e === null) throw Error(w(310));
    oe = e, e = { memoizedState: oe.memoizedState, baseState: oe.baseState, baseQueue: oe.baseQueue, queue: oe.queue, next: null }, de === null ? ee.memoizedState = de = e : de = de.next = e;
  }
  return de;
}
function Rr(e, t) {
  return typeof t == "function" ? t(e) : t;
}
function Pa(e) {
  var t = Ke(), n = t.queue;
  if (n === null) throw Error(w(311));
  n.lastRenderedReducer = e;
  var r = oe, a = r.baseQueue, s = n.pending;
  if (s !== null) {
    if (a !== null) {
      var i = a.next;
      a.next = s.next, s.next = i;
    }
    r.baseQueue = a = s, n.pending = null;
  }
  if (a !== null) {
    s = a.next, r = r.baseState;
    var o = i = null, u = null, f = s;
    do {
      var v = f.lane;
      if ((mn & v) === v) u !== null && (u = u.next = { lane: 0, action: f.action, hasEagerState: f.hasEagerState, eagerState: f.eagerState, next: null }), r = f.hasEagerState ? f.eagerState : e(r, f.action);
      else {
        var p = { lane: v, action: f.action, hasEagerState: f.hasEagerState, eagerState: f.eagerState, next: null };
        u === null ? (o = u = p, i = r) : u = u.next = p, ee.lanes |= v, gn |= v;
      }
      f = f.next;
    } while (f !== null && f !== s);
    u === null ? i = r : u.next = o, rt(r, t.memoizedState) || (Te = true), t.memoizedState = r, t.baseState = i, t.baseQueue = u, n.lastRenderedState = r;
  }
  if (e = n.interleaved, e !== null) {
    a = e;
    do
      s = a.lane, ee.lanes |= s, gn |= s, a = a.next;
    while (a !== e);
  } else a === null && (n.lanes = 0);
  return [t.memoizedState, n.dispatch];
}
function _a(e) {
  var t = Ke(), n = t.queue;
  if (n === null) throw Error(w(311));
  n.lastRenderedReducer = e;
  var r = n.dispatch, a = n.pending, s = t.memoizedState;
  if (a !== null) {
    n.pending = null;
    var i = a = a.next;
    do
      s = e(s, i.action), i = i.next;
    while (i !== a);
    rt(s, t.memoizedState) || (Te = true), t.memoizedState = s, t.baseQueue === null && (t.baseState = s), n.lastRenderedState = s;
  }
  return [s, r];
}
function nc() {
}
function rc(e, t) {
  var n = ee, r = Ke(), a = t(), s = !rt(r.memoizedState, a);
  if (s && (r.memoizedState = a, Te = true), r = r.queue, ii(sc.bind(null, n, r, e), [e]), r.getSnapshot !== t || s || de !== null && de.memoizedState.tag & 1) {
    if (n.flags |= 2048, zr(9, ac.bind(null, n, r, a, t), void 0, null), fe === null) throw Error(w(349));
    mn & 30 || lc(n, t, a);
  }
  return a;
}
function lc(e, t, n) {
  e.flags |= 16384, e = { getSnapshot: t, value: n }, t = ee.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, ee.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
}
function ac(e, t, n, r) {
  t.value = n, t.getSnapshot = r, ic(t) && oc(e);
}
function sc(e, t, n) {
  return n(function() {
    ic(t) && oc(e);
  });
}
function ic(e) {
  var t = e.getSnapshot;
  e = e.value;
  try {
    var n = t();
    return !rt(e, n);
  } catch {
    return true;
  }
}
function oc(e) {
  var t = wt(e, 1);
  t !== null && nt(t, e, 1, -1);
}
function fo(e) {
  var t = it();
  return typeof e == "function" && (e = e()), t.memoizedState = t.baseState = e, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: Rr, lastRenderedState: e }, t.queue = e, e = e.dispatch = bp.bind(null, ee, e), [t.memoizedState, e];
}
function zr(e, t, n, r) {
  return e = { tag: e, create: t, destroy: n, deps: r, next: null }, t = ee.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, ee.updateQueue = t, t.lastEffect = e.next = e) : (n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (r = n.next, n.next = e, e.next = r, t.lastEffect = e)), e;
}
function uc() {
  return Ke().memoizedState;
}
function hl(e, t, n, r) {
  var a = it();
  ee.flags |= e, a.memoizedState = zr(1 | t, n, void 0, r === void 0 ? null : r);
}
function Zl(e, t, n, r) {
  var a = Ke();
  r = r === void 0 ? null : r;
  var s = void 0;
  if (oe !== null) {
    var i = oe.memoizedState;
    if (s = i.destroy, r !== null && li(r, i.deps)) {
      a.memoizedState = zr(t, n, s, r);
      return;
    }
  }
  ee.flags |= e, a.memoizedState = zr(1 | t, n, s, r);
}
function po(e, t) {
  return hl(8390656, 8, e, t);
}
function ii(e, t) {
  return Zl(2048, 8, e, t);
}
function cc(e, t) {
  return Zl(4, 2, e, t);
}
function dc(e, t) {
  return Zl(4, 4, e, t);
}
function fc(e, t) {
  if (typeof t == "function") return e = e(), t(e), function() {
    t(null);
  };
  if (t != null) return e = e(), t.current = e, function() {
    t.current = null;
  };
}
function pc(e, t, n) {
  return n = n != null ? n.concat([e]) : null, Zl(4, 4, fc.bind(null, t, e), n);
}
function oi() {
}
function hc(e, t) {
  var n = Ke();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && li(t, r[1]) ? r[0] : (n.memoizedState = [e, t], e);
}
function mc(e, t) {
  var n = Ke();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && li(t, r[1]) ? r[0] : (e = e(), n.memoizedState = [e, t], e);
}
function gc(e, t, n) {
  return mn & 21 ? (rt(n, t) || (n = ju(), ee.lanes |= n, gn |= n, e.baseState = true), t) : (e.baseState && (e.baseState = false, Te = true), e.memoizedState = n);
}
function yp(e, t) {
  var n = W;
  W = n !== 0 && 4 > n ? n : 4, e(true);
  var r = Ea.transition;
  Ea.transition = {};
  try {
    e(false), t();
  } finally {
    W = n, Ea.transition = r;
  }
}
function vc() {
  return Ke().memoizedState;
}
function xp(e, t, n) {
  var r = Gt(e);
  if (n = { lane: r, action: n, hasEagerState: false, eagerState: null, next: null }, yc(e)) xc(t, n);
  else if (n = Zu(e, t, n, r), n !== null) {
    var a = Ce();
    nt(n, e, r, a), bc(n, t, r);
  }
}
function bp(e, t, n) {
  var r = Gt(e), a = { lane: r, action: n, hasEagerState: false, eagerState: null, next: null };
  if (yc(e)) xc(t, a);
  else {
    var s = e.alternate;
    if (e.lanes === 0 && (s === null || s.lanes === 0) && (s = t.lastRenderedReducer, s !== null)) try {
      var i = t.lastRenderedState, o = s(i, n);
      if (a.hasEagerState = true, a.eagerState = o, rt(o, i)) {
        var u = t.interleaved;
        u === null ? (a.next = a, Zs(t)) : (a.next = u.next, u.next = a), t.interleaved = a;
        return;
      }
    } catch {
    } finally {
    }
    n = Zu(e, t, a, r), n !== null && (a = Ce(), nt(n, e, r, a), bc(n, t, r));
  }
}
function yc(e) {
  var t = e.alternate;
  return e === ee || t !== null && t === ee;
}
function xc(e, t) {
  mr = Fl = true;
  var n = e.pending;
  n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
}
function bc(e, t, n) {
  if (n & 4194240) {
    var r = t.lanes;
    r &= e.pendingLanes, n |= r, t.lanes = n, Ms(e, n);
  }
}
var Ul = { readContext: Ve, useCallback: ve, useContext: ve, useEffect: ve, useImperativeHandle: ve, useInsertionEffect: ve, useLayoutEffect: ve, useMemo: ve, useReducer: ve, useRef: ve, useState: ve, useDebugValue: ve, useDeferredValue: ve, useTransition: ve, useMutableSource: ve, useSyncExternalStore: ve, useId: ve, unstable_isNewReconciler: false }, jp = { readContext: Ve, useCallback: function(e, t) {
  return it().memoizedState = [e, t === void 0 ? null : t], e;
}, useContext: Ve, useEffect: po, useImperativeHandle: function(e, t, n) {
  return n = n != null ? n.concat([e]) : null, hl(4194308, 4, fc.bind(null, t, e), n);
}, useLayoutEffect: function(e, t) {
  return hl(4194308, 4, e, t);
}, useInsertionEffect: function(e, t) {
  return hl(4, 2, e, t);
}, useMemo: function(e, t) {
  var n = it();
  return t = t === void 0 ? null : t, e = e(), n.memoizedState = [e, t], e;
}, useReducer: function(e, t, n) {
  var r = it();
  return t = n !== void 0 ? n(t) : t, r.memoizedState = r.baseState = t, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: e, lastRenderedState: t }, r.queue = e, e = e.dispatch = xp.bind(null, ee, e), [r.memoizedState, e];
}, useRef: function(e) {
  var t = it();
  return e = { current: e }, t.memoizedState = e;
}, useState: fo, useDebugValue: oi, useDeferredValue: function(e) {
  return it().memoizedState = e;
}, useTransition: function() {
  var e = fo(false), t = e[0];
  return e = yp.bind(null, e[1]), it().memoizedState = e, [t, e];
}, useMutableSource: function() {
}, useSyncExternalStore: function(e, t, n) {
  var r = ee, a = it();
  if (J) {
    if (n === void 0) throw Error(w(407));
    n = n();
  } else {
    if (n = t(), fe === null) throw Error(w(349));
    mn & 30 || lc(r, t, n);
  }
  a.memoizedState = n;
  var s = { value: n, getSnapshot: t };
  return a.queue = s, po(sc.bind(null, r, s, e), [e]), r.flags |= 2048, zr(9, ac.bind(null, r, s, n, t), void 0, null), n;
}, useId: function() {
  var e = it(), t = fe.identifierPrefix;
  if (J) {
    var n = vt, r = gt;
    n = (r & ~(1 << 32 - tt(r) - 1)).toString(32) + n, t = ":" + t + "R" + n, n = Or++, 0 < n && (t += "H" + n.toString(32)), t += ":";
  } else n = vp++, t = ":" + t + "r" + n.toString(32) + ":";
  return e.memoizedState = t;
}, unstable_isNewReconciler: false }, wp = { readContext: Ve, useCallback: hc, useContext: Ve, useEffect: ii, useImperativeHandle: pc, useInsertionEffect: cc, useLayoutEffect: dc, useMemo: mc, useReducer: Pa, useRef: uc, useState: function() {
  return Pa(Rr);
}, useDebugValue: oi, useDeferredValue: function(e) {
  var t = Ke();
  return gc(t, oe.memoizedState, e);
}, useTransition: function() {
  var e = Pa(Rr)[0], t = Ke().memoizedState;
  return [e, t];
}, useMutableSource: nc, useSyncExternalStore: rc, useId: vc, unstable_isNewReconciler: false }, kp = { readContext: Ve, useCallback: hc, useContext: Ve, useEffect: ii, useImperativeHandle: pc, useInsertionEffect: cc, useLayoutEffect: dc, useMemo: mc, useReducer: _a, useRef: uc, useState: function() {
  return _a(Rr);
}, useDebugValue: oi, useDeferredValue: function(e) {
  var t = Ke();
  return oe === null ? t.memoizedState = e : gc(t, oe.memoizedState, e);
}, useTransition: function() {
  var e = _a(Rr)[0], t = Ke().memoizedState;
  return [e, t];
}, useMutableSource: nc, useSyncExternalStore: rc, useId: vc, unstable_isNewReconciler: false };
function Ye(e, t) {
  if (e && e.defaultProps) {
    t = te({}, t), e = e.defaultProps;
    for (var n in e) t[n] === void 0 && (t[n] = e[n]);
    return t;
  }
  return t;
}
function fs(e, t, n, r) {
  t = e.memoizedState, n = n(r, t), n = n == null ? t : te({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
}
var ea = { isMounted: function(e) {
  return (e = e._reactInternals) ? xn(e) === e : false;
}, enqueueSetState: function(e, t, n) {
  e = e._reactInternals;
  var r = Ce(), a = Gt(e), s = yt(r, a);
  s.payload = t, n != null && (s.callback = n), t = Kt(e, s, a), t !== null && (nt(t, e, a, r), fl(t, e, a));
}, enqueueReplaceState: function(e, t, n) {
  e = e._reactInternals;
  var r = Ce(), a = Gt(e), s = yt(r, a);
  s.tag = 1, s.payload = t, n != null && (s.callback = n), t = Kt(e, s, a), t !== null && (nt(t, e, a, r), fl(t, e, a));
}, enqueueForceUpdate: function(e, t) {
  e = e._reactInternals;
  var n = Ce(), r = Gt(e), a = yt(n, r);
  a.tag = 2, t != null && (a.callback = t), t = Kt(e, a, r), t !== null && (nt(t, e, r, n), fl(t, e, r));
} };
function ho(e, t, n, r, a, s, i) {
  return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, s, i) : t.prototype && t.prototype.isPureReactComponent ? !Er(n, r) || !Er(a, s) : true;
}
function jc(e, t, n) {
  var r = false, a = Jt, s = t.contextType;
  return typeof s == "object" && s !== null ? s = Ve(s) : (a = Le(t) ? pn : be.current, r = t.contextTypes, s = (r = r != null) ? An(e, a) : Jt), t = new t(n, s), e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null, t.updater = ea, e.stateNode = t, t._reactInternals = e, r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = a, e.__reactInternalMemoizedMaskedChildContext = s), t;
}
function mo(e, t, n, r) {
  e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, r), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, r), t.state !== e && ea.enqueueReplaceState(t, t.state, null);
}
function ps(e, t, n, r) {
  var a = e.stateNode;
  a.props = n, a.state = e.memoizedState, a.refs = {}, ei(e);
  var s = t.contextType;
  typeof s == "object" && s !== null ? a.context = Ve(s) : (s = Le(t) ? pn : be.current, a.context = An(e, s)), a.state = e.memoizedState, s = t.getDerivedStateFromProps, typeof s == "function" && (fs(e, t, s, n), a.state = e.memoizedState), typeof t.getDerivedStateFromProps == "function" || typeof a.getSnapshotBeforeUpdate == "function" || typeof a.UNSAFE_componentWillMount != "function" && typeof a.componentWillMount != "function" || (t = a.state, typeof a.componentWillMount == "function" && a.componentWillMount(), typeof a.UNSAFE_componentWillMount == "function" && a.UNSAFE_componentWillMount(), t !== a.state && ea.enqueueReplaceState(a, a.state, null), Rl(e, n, a, r), a.state = e.memoizedState), typeof a.componentDidMount == "function" && (e.flags |= 4194308);
}
function Wn(e, t) {
  try {
    var n = "", r = t;
    do
      n += Yd(r), r = r.return;
    while (r);
    var a = n;
  } catch (s) {
    a = `
Error generating stack: ` + s.message + `
` + s.stack;
  }
  return { value: e, source: t, stack: a, digest: null };
}
function Ta(e, t, n) {
  return { value: e, source: null, stack: n ?? null, digest: t ?? null };
}
function hs(e, t) {
  try {
    console.error(t.value);
  } catch (n) {
    setTimeout(function() {
      throw n;
    });
  }
}
var Sp = typeof WeakMap == "function" ? WeakMap : Map;
function wc(e, t, n) {
  n = yt(-1, n), n.tag = 3, n.payload = { element: null };
  var r = t.value;
  return n.callback = function() {
    Ml || (Ml = true, ks = r), hs(e, t);
  }, n;
}
function kc(e, t, n) {
  n = yt(-1, n), n.tag = 3;
  var r = e.type.getDerivedStateFromError;
  if (typeof r == "function") {
    var a = t.value;
    n.payload = function() {
      return r(a);
    }, n.callback = function() {
      hs(e, t);
    };
  }
  var s = e.stateNode;
  return s !== null && typeof s.componentDidCatch == "function" && (n.callback = function() {
    hs(e, t), typeof r != "function" && (qt === null ? qt = /* @__PURE__ */ new Set([this]) : qt.add(this));
    var i = t.stack;
    this.componentDidCatch(t.value, { componentStack: i !== null ? i : "" });
  }), n;
}
function go(e, t, n) {
  var r = e.pingCache;
  if (r === null) {
    r = e.pingCache = new Sp();
    var a = /* @__PURE__ */ new Set();
    r.set(t, a);
  } else a = r.get(t), a === void 0 && (a = /* @__PURE__ */ new Set(), r.set(t, a));
  a.has(n) || (a.add(n), e = $p.bind(null, e, t, n), t.then(e, e));
}
function vo(e) {
  do {
    var t;
    if ((t = e.tag === 13) && (t = e.memoizedState, t = t !== null ? t.dehydrated !== null : true), t) return e;
    e = e.return;
  } while (e !== null);
  return null;
}
function yo(e, t, n, r, a) {
  return e.mode & 1 ? (e.flags |= 65536, e.lanes = a, e) : (e === t ? e.flags |= 65536 : (e.flags |= 128, n.flags |= 131072, n.flags &= -52805, n.tag === 1 && (n.alternate === null ? n.tag = 17 : (t = yt(-1, 1), t.tag = 2, Kt(n, t, 1))), n.lanes |= 1), e);
}
var Cp = Ot.ReactCurrentOwner, Te = false;
function Se(e, t, n, r) {
  t.child = e === null ? Ju(t, null, n, r) : Qn(t, e.child, n, r);
}
function xo(e, t, n, r, a) {
  n = n.render;
  var s = t.ref;
  return Un(t, a), r = ai(e, t, n, r, s, a), n = si(), e !== null && !Te ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~a, kt(e, t, a)) : (J && n && Ks(t), t.flags |= 1, Se(e, t, r, a), t.child);
}
function bo(e, t, n, r, a) {
  if (e === null) {
    var s = n.type;
    return typeof s == "function" && !gi(s) && s.defaultProps === void 0 && n.compare === null && n.defaultProps === void 0 ? (t.tag = 15, t.type = s, Sc(e, t, s, r, a)) : (e = yl(n.type, null, r, t, t.mode, a), e.ref = t.ref, e.return = t, t.child = e);
  }
  if (s = e.child, !(e.lanes & a)) {
    var i = s.memoizedProps;
    if (n = n.compare, n = n !== null ? n : Er, n(i, r) && e.ref === t.ref) return kt(e, t, a);
  }
  return t.flags |= 1, e = Yt(s, r), e.ref = t.ref, e.return = t, t.child = e;
}
function Sc(e, t, n, r, a) {
  if (e !== null) {
    var s = e.memoizedProps;
    if (Er(s, r) && e.ref === t.ref) if (Te = false, t.pendingProps = r = s, (e.lanes & a) !== 0) e.flags & 131072 && (Te = true);
    else return t.lanes = e.lanes, kt(e, t, a);
  }
  return ms(e, t, n, r, a);
}
function Cc(e, t, n) {
  var r = t.pendingProps, a = r.children, s = e !== null ? e.memoizedState : null;
  if (r.mode === "hidden") if (!(t.mode & 1)) t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, q(Ln, ze), ze |= n;
  else {
    if (!(n & 1073741824)) return e = s !== null ? s.baseLanes | n : n, t.lanes = t.childLanes = 1073741824, t.memoizedState = { baseLanes: e, cachePool: null, transitions: null }, t.updateQueue = null, q(Ln, ze), ze |= e, null;
    t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, r = s !== null ? s.baseLanes : n, q(Ln, ze), ze |= r;
  }
  else s !== null ? (r = s.baseLanes | n, t.memoizedState = null) : r = n, q(Ln, ze), ze |= r;
  return Se(e, t, a, n), t.child;
}
function Nc(e, t) {
  var n = t.ref;
  (e === null && n !== null || e !== null && e.ref !== n) && (t.flags |= 512, t.flags |= 2097152);
}
function ms(e, t, n, r, a) {
  var s = Le(n) ? pn : be.current;
  return s = An(t, s), Un(t, a), n = ai(e, t, n, r, s, a), r = si(), e !== null && !Te ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~a, kt(e, t, a)) : (J && r && Ks(t), t.flags |= 1, Se(e, t, n, a), t.child);
}
function jo(e, t, n, r, a) {
  if (Le(n)) {
    var s = true;
    _l(t);
  } else s = false;
  if (Un(t, a), t.stateNode === null) ml(e, t), jc(t, n, r), ps(t, n, r, a), r = true;
  else if (e === null) {
    var i = t.stateNode, o = t.memoizedProps;
    i.props = o;
    var u = i.context, f = n.contextType;
    typeof f == "object" && f !== null ? f = Ve(f) : (f = Le(n) ? pn : be.current, f = An(t, f));
    var v = n.getDerivedStateFromProps, p = typeof v == "function" || typeof i.getSnapshotBeforeUpdate == "function";
    p || typeof i.UNSAFE_componentWillReceiveProps != "function" && typeof i.componentWillReceiveProps != "function" || (o !== r || u !== f) && mo(t, i, r, f), $t = false;
    var g = t.memoizedState;
    i.state = g, Rl(t, r, i, a), u = t.memoizedState, o !== r || g !== u || Ie.current || $t ? (typeof v == "function" && (fs(t, n, v, r), u = t.memoizedState), (o = $t || ho(t, n, o, r, g, u, f)) ? (p || typeof i.UNSAFE_componentWillMount != "function" && typeof i.componentWillMount != "function" || (typeof i.componentWillMount == "function" && i.componentWillMount(), typeof i.UNSAFE_componentWillMount == "function" && i.UNSAFE_componentWillMount()), typeof i.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof i.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = r, t.memoizedState = u), i.props = r, i.state = u, i.context = f, r = o) : (typeof i.componentDidMount == "function" && (t.flags |= 4194308), r = false);
  } else {
    i = t.stateNode, ec(e, t), o = t.memoizedProps, f = t.type === t.elementType ? o : Ye(t.type, o), i.props = f, p = t.pendingProps, g = i.context, u = n.contextType, typeof u == "object" && u !== null ? u = Ve(u) : (u = Le(n) ? pn : be.current, u = An(t, u));
    var m = n.getDerivedStateFromProps;
    (v = typeof m == "function" || typeof i.getSnapshotBeforeUpdate == "function") || typeof i.UNSAFE_componentWillReceiveProps != "function" && typeof i.componentWillReceiveProps != "function" || (o !== p || g !== u) && mo(t, i, r, u), $t = false, g = t.memoizedState, i.state = g, Rl(t, r, i, a);
    var x = t.memoizedState;
    o !== p || g !== x || Ie.current || $t ? (typeof m == "function" && (fs(t, n, m, r), x = t.memoizedState), (f = $t || ho(t, n, f, r, g, x, u) || false) ? (v || typeof i.UNSAFE_componentWillUpdate != "function" && typeof i.componentWillUpdate != "function" || (typeof i.componentWillUpdate == "function" && i.componentWillUpdate(r, x, u), typeof i.UNSAFE_componentWillUpdate == "function" && i.UNSAFE_componentWillUpdate(r, x, u)), typeof i.componentDidUpdate == "function" && (t.flags |= 4), typeof i.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof i.componentDidUpdate != "function" || o === e.memoizedProps && g === e.memoizedState || (t.flags |= 4), typeof i.getSnapshotBeforeUpdate != "function" || o === e.memoizedProps && g === e.memoizedState || (t.flags |= 1024), t.memoizedProps = r, t.memoizedState = x), i.props = r, i.state = x, i.context = u, r = f) : (typeof i.componentDidUpdate != "function" || o === e.memoizedProps && g === e.memoizedState || (t.flags |= 4), typeof i.getSnapshotBeforeUpdate != "function" || o === e.memoizedProps && g === e.memoizedState || (t.flags |= 1024), r = false);
  }
  return gs(e, t, n, r, s, a);
}
function gs(e, t, n, r, a, s) {
  Nc(e, t);
  var i = (t.flags & 128) !== 0;
  if (!r && !i) return a && ao(t, n, false), kt(e, t, s);
  r = t.stateNode, Cp.current = t;
  var o = i && typeof n.getDerivedStateFromError != "function" ? null : r.render();
  return t.flags |= 1, e !== null && i ? (t.child = Qn(t, e.child, null, s), t.child = Qn(t, null, o, s)) : Se(e, t, o, s), t.memoizedState = r.state, a && ao(t, n, true), t.child;
}
function Ec(e) {
  var t = e.stateNode;
  t.pendingContext ? lo(e, t.pendingContext, t.pendingContext !== t.context) : t.context && lo(e, t.context, false), ti(e, t.containerInfo);
}
function wo(e, t, n, r, a) {
  return Bn(), Gs(a), t.flags |= 256, Se(e, t, n, r), t.child;
}
var vs = { dehydrated: null, treeContext: null, retryLane: 0 };
function ys(e) {
  return { baseLanes: e, cachePool: null, transitions: null };
}
function Pc(e, t, n) {
  var r = t.pendingProps, a = Z.current, s = false, i = (t.flags & 128) !== 0, o;
  if ((o = i) || (o = e !== null && e.memoizedState === null ? false : (a & 2) !== 0), o ? (s = true, t.flags &= -129) : (e === null || e.memoizedState !== null) && (a |= 1), q(Z, a & 1), e === null) return cs(t), e = t.memoizedState, e !== null && (e = e.dehydrated, e !== null) ? (t.mode & 1 ? e.data === "$!" ? t.lanes = 8 : t.lanes = 1073741824 : t.lanes = 1, null) : (i = r.children, e = r.fallback, s ? (r = t.mode, s = t.child, i = { mode: "hidden", children: i }, !(r & 1) && s !== null ? (s.childLanes = 0, s.pendingProps = i) : s = ra(i, r, 0, null), e = fn(e, r, n, null), s.return = t, e.return = t, s.sibling = e, t.child = s, t.child.memoizedState = ys(n), t.memoizedState = vs, e) : ui(t, i));
  if (a = e.memoizedState, a !== null && (o = a.dehydrated, o !== null)) return Np(e, t, i, r, o, a, n);
  if (s) {
    s = r.fallback, i = t.mode, a = e.child, o = a.sibling;
    var u = { mode: "hidden", children: r.children };
    return !(i & 1) && t.child !== a ? (r = t.child, r.childLanes = 0, r.pendingProps = u, t.deletions = null) : (r = Yt(a, u), r.subtreeFlags = a.subtreeFlags & 14680064), o !== null ? s = Yt(o, s) : (s = fn(s, i, n, null), s.flags |= 2), s.return = t, r.return = t, r.sibling = s, t.child = r, r = s, s = t.child, i = e.child.memoizedState, i = i === null ? ys(n) : { baseLanes: i.baseLanes | n, cachePool: null, transitions: i.transitions }, s.memoizedState = i, s.childLanes = e.childLanes & ~n, t.memoizedState = vs, r;
  }
  return s = e.child, e = s.sibling, r = Yt(s, { mode: "visible", children: r.children }), !(t.mode & 1) && (r.lanes = n), r.return = t, r.sibling = null, e !== null && (n = t.deletions, n === null ? (t.deletions = [e], t.flags |= 16) : n.push(e)), t.child = r, t.memoizedState = null, r;
}
function ui(e, t) {
  return t = ra({ mode: "visible", children: t }, e.mode, 0, null), t.return = e, e.child = t;
}
function tl(e, t, n, r) {
  return r !== null && Gs(r), Qn(t, e.child, null, n), e = ui(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
}
function Np(e, t, n, r, a, s, i) {
  if (n) return t.flags & 256 ? (t.flags &= -257, r = Ta(Error(w(422))), tl(e, t, i, r)) : t.memoizedState !== null ? (t.child = e.child, t.flags |= 128, null) : (s = r.fallback, a = t.mode, r = ra({ mode: "visible", children: r.children }, a, 0, null), s = fn(s, a, i, null), s.flags |= 2, r.return = t, s.return = t, r.sibling = s, t.child = r, t.mode & 1 && Qn(t, e.child, null, i), t.child.memoizedState = ys(i), t.memoizedState = vs, s);
  if (!(t.mode & 1)) return tl(e, t, i, null);
  if (a.data === "$!") {
    if (r = a.nextSibling && a.nextSibling.dataset, r) var o = r.dgst;
    return r = o, s = Error(w(419)), r = Ta(s, r, void 0), tl(e, t, i, r);
  }
  if (o = (i & e.childLanes) !== 0, Te || o) {
    if (r = fe, r !== null) {
      switch (i & -i) {
        case 4:
          a = 2;
          break;
        case 16:
          a = 8;
          break;
        case 64:
        case 128:
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
        case 67108864:
          a = 32;
          break;
        case 536870912:
          a = 268435456;
          break;
        default:
          a = 0;
      }
      a = a & (r.suspendedLanes | i) ? 0 : a, a !== 0 && a !== s.retryLane && (s.retryLane = a, wt(e, a), nt(r, e, a, -1));
    }
    return mi(), r = Ta(Error(w(421))), tl(e, t, i, r);
  }
  return a.data === "$?" ? (t.flags |= 128, t.child = e.child, t = Mp.bind(null, e), a._reactRetry = t, null) : (e = s.treeContext, Fe = Vt(a.nextSibling), Ue = t, J = true, Ze = null, e !== null && (Be[Qe++] = gt, Be[Qe++] = vt, Be[Qe++] = hn, gt = e.id, vt = e.overflow, hn = t), t = ui(t, r.children), t.flags |= 4096, t);
}
function ko(e, t, n) {
  e.lanes |= t;
  var r = e.alternate;
  r !== null && (r.lanes |= t), ds(e.return, t, n);
}
function Ia(e, t, n, r, a) {
  var s = e.memoizedState;
  s === null ? e.memoizedState = { isBackwards: t, rendering: null, renderingStartTime: 0, last: r, tail: n, tailMode: a } : (s.isBackwards = t, s.rendering = null, s.renderingStartTime = 0, s.last = r, s.tail = n, s.tailMode = a);
}
function _c(e, t, n) {
  var r = t.pendingProps, a = r.revealOrder, s = r.tail;
  if (Se(e, t, r.children, n), r = Z.current, r & 2) r = r & 1 | 2, t.flags |= 128;
  else {
    if (e !== null && e.flags & 128) e: for (e = t.child; e !== null; ) {
      if (e.tag === 13) e.memoizedState !== null && ko(e, n, t);
      else if (e.tag === 19) ko(e, n, t);
      else if (e.child !== null) {
        e.child.return = e, e = e.child;
        continue;
      }
      if (e === t) break e;
      for (; e.sibling === null; ) {
        if (e.return === null || e.return === t) break e;
        e = e.return;
      }
      e.sibling.return = e.return, e = e.sibling;
    }
    r &= 1;
  }
  if (q(Z, r), !(t.mode & 1)) t.memoizedState = null;
  else switch (a) {
    case "forwards":
      for (n = t.child, a = null; n !== null; ) e = n.alternate, e !== null && zl(e) === null && (a = n), n = n.sibling;
      n = a, n === null ? (a = t.child, t.child = null) : (a = n.sibling, n.sibling = null), Ia(t, false, a, n, s);
      break;
    case "backwards":
      for (n = null, a = t.child, t.child = null; a !== null; ) {
        if (e = a.alternate, e !== null && zl(e) === null) {
          t.child = a;
          break;
        }
        e = a.sibling, a.sibling = n, n = a, a = e;
      }
      Ia(t, true, n, null, s);
      break;
    case "together":
      Ia(t, false, null, null, void 0);
      break;
    default:
      t.memoizedState = null;
  }
  return t.child;
}
function ml(e, t) {
  !(t.mode & 1) && e !== null && (e.alternate = null, t.alternate = null, t.flags |= 2);
}
function kt(e, t, n) {
  if (e !== null && (t.dependencies = e.dependencies), gn |= t.lanes, !(n & t.childLanes)) return null;
  if (e !== null && t.child !== e.child) throw Error(w(153));
  if (t.child !== null) {
    for (e = t.child, n = Yt(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null; ) e = e.sibling, n = n.sibling = Yt(e, e.pendingProps), n.return = t;
    n.sibling = null;
  }
  return t.child;
}
function Ep(e, t, n) {
  switch (t.tag) {
    case 3:
      Ec(t), Bn();
      break;
    case 5:
      tc(t);
      break;
    case 1:
      Le(t.type) && _l(t);
      break;
    case 4:
      ti(t, t.stateNode.containerInfo);
      break;
    case 10:
      var r = t.type._context, a = t.memoizedProps.value;
      q(Ll, r._currentValue), r._currentValue = a;
      break;
    case 13:
      if (r = t.memoizedState, r !== null) return r.dehydrated !== null ? (q(Z, Z.current & 1), t.flags |= 128, null) : n & t.child.childLanes ? Pc(e, t, n) : (q(Z, Z.current & 1), e = kt(e, t, n), e !== null ? e.sibling : null);
      q(Z, Z.current & 1);
      break;
    case 19:
      if (r = (n & t.childLanes) !== 0, e.flags & 128) {
        if (r) return _c(e, t, n);
        t.flags |= 128;
      }
      if (a = t.memoizedState, a !== null && (a.rendering = null, a.tail = null, a.lastEffect = null), q(Z, Z.current), r) break;
      return null;
    case 22:
    case 23:
      return t.lanes = 0, Cc(e, t, n);
  }
  return kt(e, t, n);
}
var Tc, xs, Ic, Lc;
Tc = function(e, t) {
  for (var n = t.child; n !== null; ) {
    if (n.tag === 5 || n.tag === 6) e.appendChild(n.stateNode);
    else if (n.tag !== 4 && n.child !== null) {
      n.child.return = n, n = n.child;
      continue;
    }
    if (n === t) break;
    for (; n.sibling === null; ) {
      if (n.return === null || n.return === t) return;
      n = n.return;
    }
    n.sibling.return = n.return, n = n.sibling;
  }
};
xs = function() {
};
Ic = function(e, t, n, r) {
  var a = e.memoizedProps;
  if (a !== r) {
    e = t.stateNode, un(ct.current);
    var s = null;
    switch (n) {
      case "input":
        a = Aa(e, a), r = Aa(e, r), s = [];
        break;
      case "select":
        a = te({}, a, { value: void 0 }), r = te({}, r, { value: void 0 }), s = [];
        break;
      case "textarea":
        a = Ha(e, a), r = Ha(e, r), s = [];
        break;
      default:
        typeof a.onClick != "function" && typeof r.onClick == "function" && (e.onclick = El);
    }
    Va(n, r);
    var i;
    n = null;
    for (f in a) if (!r.hasOwnProperty(f) && a.hasOwnProperty(f) && a[f] != null) if (f === "style") {
      var o = a[f];
      for (i in o) o.hasOwnProperty(i) && (n || (n = {}), n[i] = "");
    } else f !== "dangerouslySetInnerHTML" && f !== "children" && f !== "suppressContentEditableWarning" && f !== "suppressHydrationWarning" && f !== "autoFocus" && (br.hasOwnProperty(f) ? s || (s = []) : (s = s || []).push(f, null));
    for (f in r) {
      var u = r[f];
      if (o = a != null ? a[f] : void 0, r.hasOwnProperty(f) && u !== o && (u != null || o != null)) if (f === "style") if (o) {
        for (i in o) !o.hasOwnProperty(i) || u && u.hasOwnProperty(i) || (n || (n = {}), n[i] = "");
        for (i in u) u.hasOwnProperty(i) && o[i] !== u[i] && (n || (n = {}), n[i] = u[i]);
      } else n || (s || (s = []), s.push(f, n)), n = u;
      else f === "dangerouslySetInnerHTML" ? (u = u ? u.__html : void 0, o = o ? o.__html : void 0, u != null && o !== u && (s = s || []).push(f, u)) : f === "children" ? typeof u != "string" && typeof u != "number" || (s = s || []).push(f, "" + u) : f !== "suppressContentEditableWarning" && f !== "suppressHydrationWarning" && (br.hasOwnProperty(f) ? (u != null && f === "onScroll" && Y("scroll", e), s || o === u || (s = [])) : (s = s || []).push(f, u));
    }
    n && (s = s || []).push("style", n);
    var f = s;
    (t.updateQueue = f) && (t.flags |= 4);
  }
};
Lc = function(e, t, n, r) {
  n !== r && (t.flags |= 4);
};
function lr(e, t) {
  if (!J) switch (e.tailMode) {
    case "hidden":
      t = e.tail;
      for (var n = null; t !== null; ) t.alternate !== null && (n = t), t = t.sibling;
      n === null ? e.tail = null : n.sibling = null;
      break;
    case "collapsed":
      n = e.tail;
      for (var r = null; n !== null; ) n.alternate !== null && (r = n), n = n.sibling;
      r === null ? t || e.tail === null ? e.tail = null : e.tail.sibling = null : r.sibling = null;
  }
}
function ye(e) {
  var t = e.alternate !== null && e.alternate.child === e.child, n = 0, r = 0;
  if (t) for (var a = e.child; a !== null; ) n |= a.lanes | a.childLanes, r |= a.subtreeFlags & 14680064, r |= a.flags & 14680064, a.return = e, a = a.sibling;
  else for (a = e.child; a !== null; ) n |= a.lanes | a.childLanes, r |= a.subtreeFlags, r |= a.flags, a.return = e, a = a.sibling;
  return e.subtreeFlags |= r, e.childLanes = n, t;
}
function Pp(e, t, n) {
  var r = t.pendingProps;
  switch (qs(t), t.tag) {
    case 2:
    case 16:
    case 15:
    case 0:
    case 11:
    case 7:
    case 8:
    case 12:
    case 9:
    case 14:
      return ye(t), null;
    case 1:
      return Le(t.type) && Pl(), ye(t), null;
    case 3:
      return r = t.stateNode, Hn(), X(Ie), X(be), ri(), r.pendingContext && (r.context = r.pendingContext, r.pendingContext = null), (e === null || e.child === null) && (Zr(t) ? t.flags |= 4 : e === null || e.memoizedState.isDehydrated && !(t.flags & 256) || (t.flags |= 1024, Ze !== null && (Ns(Ze), Ze = null))), xs(e, t), ye(t), null;
    case 5:
      ni(t);
      var a = un(Lr.current);
      if (n = t.type, e !== null && t.stateNode != null) Ic(e, t, n, r, a), e.ref !== t.ref && (t.flags |= 512, t.flags |= 2097152);
      else {
        if (!r) {
          if (t.stateNode === null) throw Error(w(166));
          return ye(t), null;
        }
        if (e = un(ct.current), Zr(t)) {
          r = t.stateNode, n = t.type;
          var s = t.memoizedProps;
          switch (r[ot] = t, r[Tr] = s, e = (t.mode & 1) !== 0, n) {
            case "dialog":
              Y("cancel", r), Y("close", r);
              break;
            case "iframe":
            case "object":
            case "embed":
              Y("load", r);
              break;
            case "video":
            case "audio":
              for (a = 0; a < ur.length; a++) Y(ur[a], r);
              break;
            case "source":
              Y("error", r);
              break;
            case "img":
            case "image":
            case "link":
              Y("error", r), Y("load", r);
              break;
            case "details":
              Y("toggle", r);
              break;
            case "input":
              Ii(r, s), Y("invalid", r);
              break;
            case "select":
              r._wrapperState = { wasMultiple: !!s.multiple }, Y("invalid", r);
              break;
            case "textarea":
              Oi(r, s), Y("invalid", r);
          }
          Va(n, s), a = null;
          for (var i in s) if (s.hasOwnProperty(i)) {
            var o = s[i];
            i === "children" ? typeof o == "string" ? r.textContent !== o && (s.suppressHydrationWarning !== true && Jr(r.textContent, o, e), a = ["children", o]) : typeof o == "number" && r.textContent !== "" + o && (s.suppressHydrationWarning !== true && Jr(r.textContent, o, e), a = ["children", "" + o]) : br.hasOwnProperty(i) && o != null && i === "onScroll" && Y("scroll", r);
          }
          switch (n) {
            case "input":
              Hr(r), Li(r, s, true);
              break;
            case "textarea":
              Hr(r), Ri(r);
              break;
            case "select":
            case "option":
              break;
            default:
              typeof s.onClick == "function" && (r.onclick = El);
          }
          r = a, t.updateQueue = r, r !== null && (t.flags |= 4);
        } else {
          i = a.nodeType === 9 ? a : a.ownerDocument, e === "http://www.w3.org/1999/xhtml" && (e = su(n)), e === "http://www.w3.org/1999/xhtml" ? n === "script" ? (e = i.createElement("div"), e.innerHTML = "<script><\/script>", e = e.removeChild(e.firstChild)) : typeof r.is == "string" ? e = i.createElement(n, { is: r.is }) : (e = i.createElement(n), n === "select" && (i = e, r.multiple ? i.multiple = true : r.size && (i.size = r.size))) : e = i.createElementNS(e, n), e[ot] = t, e[Tr] = r, Tc(e, t, false, false), t.stateNode = e;
          e: {
            switch (i = Ka(n, r), n) {
              case "dialog":
                Y("cancel", e), Y("close", e), a = r;
                break;
              case "iframe":
              case "object":
              case "embed":
                Y("load", e), a = r;
                break;
              case "video":
              case "audio":
                for (a = 0; a < ur.length; a++) Y(ur[a], e);
                a = r;
                break;
              case "source":
                Y("error", e), a = r;
                break;
              case "img":
              case "image":
              case "link":
                Y("error", e), Y("load", e), a = r;
                break;
              case "details":
                Y("toggle", e), a = r;
                break;
              case "input":
                Ii(e, r), a = Aa(e, r), Y("invalid", e);
                break;
              case "option":
                a = r;
                break;
              case "select":
                e._wrapperState = { wasMultiple: !!r.multiple }, a = te({}, r, { value: void 0 }), Y("invalid", e);
                break;
              case "textarea":
                Oi(e, r), a = Ha(e, r), Y("invalid", e);
                break;
              default:
                a = r;
            }
            Va(n, a), o = a;
            for (s in o) if (o.hasOwnProperty(s)) {
              var u = o[s];
              s === "style" ? uu(e, u) : s === "dangerouslySetInnerHTML" ? (u = u ? u.__html : void 0, u != null && iu(e, u)) : s === "children" ? typeof u == "string" ? (n !== "textarea" || u !== "") && jr(e, u) : typeof u == "number" && jr(e, "" + u) : s !== "suppressContentEditableWarning" && s !== "suppressHydrationWarning" && s !== "autoFocus" && (br.hasOwnProperty(s) ? u != null && s === "onScroll" && Y("scroll", e) : u != null && Os(e, s, u, i));
            }
            switch (n) {
              case "input":
                Hr(e), Li(e, r, false);
                break;
              case "textarea":
                Hr(e), Ri(e);
                break;
              case "option":
                r.value != null && e.setAttribute("value", "" + Xt(r.value));
                break;
              case "select":
                e.multiple = !!r.multiple, s = r.value, s != null ? On(e, !!r.multiple, s, false) : r.defaultValue != null && On(e, !!r.multiple, r.defaultValue, true);
                break;
              default:
                typeof a.onClick == "function" && (e.onclick = El);
            }
            switch (n) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                r = !!r.autoFocus;
                break e;
              case "img":
                r = true;
                break e;
              default:
                r = false;
            }
          }
          r && (t.flags |= 4);
        }
        t.ref !== null && (t.flags |= 512, t.flags |= 2097152);
      }
      return ye(t), null;
    case 6:
      if (e && t.stateNode != null) Lc(e, t, e.memoizedProps, r);
      else {
        if (typeof r != "string" && t.stateNode === null) throw Error(w(166));
        if (n = un(Lr.current), un(ct.current), Zr(t)) {
          if (r = t.stateNode, n = t.memoizedProps, r[ot] = t, (s = r.nodeValue !== n) && (e = Ue, e !== null)) switch (e.tag) {
            case 3:
              Jr(r.nodeValue, n, (e.mode & 1) !== 0);
              break;
            case 5:
              e.memoizedProps.suppressHydrationWarning !== true && Jr(r.nodeValue, n, (e.mode & 1) !== 0);
          }
          s && (t.flags |= 4);
        } else r = (n.nodeType === 9 ? n : n.ownerDocument).createTextNode(r), r[ot] = t, t.stateNode = r;
      }
      return ye(t), null;
    case 13:
      if (X(Z), r = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
        if (J && Fe !== null && t.mode & 1 && !(t.flags & 128)) Yu(), Bn(), t.flags |= 98560, s = false;
        else if (s = Zr(t), r !== null && r.dehydrated !== null) {
          if (e === null) {
            if (!s) throw Error(w(318));
            if (s = t.memoizedState, s = s !== null ? s.dehydrated : null, !s) throw Error(w(317));
            s[ot] = t;
          } else Bn(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
          ye(t), s = false;
        } else Ze !== null && (Ns(Ze), Ze = null), s = true;
        if (!s) return t.flags & 65536 ? t : null;
      }
      return t.flags & 128 ? (t.lanes = n, t) : (r = r !== null, r !== (e !== null && e.memoizedState !== null) && r && (t.child.flags |= 8192, t.mode & 1 && (e === null || Z.current & 1 ? ue === 0 && (ue = 3) : mi())), t.updateQueue !== null && (t.flags |= 4), ye(t), null);
    case 4:
      return Hn(), xs(e, t), e === null && Pr(t.stateNode.containerInfo), ye(t), null;
    case 10:
      return Js(t.type._context), ye(t), null;
    case 17:
      return Le(t.type) && Pl(), ye(t), null;
    case 19:
      if (X(Z), s = t.memoizedState, s === null) return ye(t), null;
      if (r = (t.flags & 128) !== 0, i = s.rendering, i === null) if (r) lr(s, false);
      else {
        if (ue !== 0 || e !== null && e.flags & 128) for (e = t.child; e !== null; ) {
          if (i = zl(e), i !== null) {
            for (t.flags |= 128, lr(s, false), r = i.updateQueue, r !== null && (t.updateQueue = r, t.flags |= 4), t.subtreeFlags = 0, r = n, n = t.child; n !== null; ) s = n, e = r, s.flags &= 14680066, i = s.alternate, i === null ? (s.childLanes = 0, s.lanes = e, s.child = null, s.subtreeFlags = 0, s.memoizedProps = null, s.memoizedState = null, s.updateQueue = null, s.dependencies = null, s.stateNode = null) : (s.childLanes = i.childLanes, s.lanes = i.lanes, s.child = i.child, s.subtreeFlags = 0, s.deletions = null, s.memoizedProps = i.memoizedProps, s.memoizedState = i.memoizedState, s.updateQueue = i.updateQueue, s.type = i.type, e = i.dependencies, s.dependencies = e === null ? null : { lanes: e.lanes, firstContext: e.firstContext }), n = n.sibling;
            return q(Z, Z.current & 1 | 2), t.child;
          }
          e = e.sibling;
        }
        s.tail !== null && le() > Vn && (t.flags |= 128, r = true, lr(s, false), t.lanes = 4194304);
      }
      else {
        if (!r) if (e = zl(i), e !== null) {
          if (t.flags |= 128, r = true, n = e.updateQueue, n !== null && (t.updateQueue = n, t.flags |= 4), lr(s, true), s.tail === null && s.tailMode === "hidden" && !i.alternate && !J) return ye(t), null;
        } else 2 * le() - s.renderingStartTime > Vn && n !== 1073741824 && (t.flags |= 128, r = true, lr(s, false), t.lanes = 4194304);
        s.isBackwards ? (i.sibling = t.child, t.child = i) : (n = s.last, n !== null ? n.sibling = i : t.child = i, s.last = i);
      }
      return s.tail !== null ? (t = s.tail, s.rendering = t, s.tail = t.sibling, s.renderingStartTime = le(), t.sibling = null, n = Z.current, q(Z, r ? n & 1 | 2 : n & 1), t) : (ye(t), null);
    case 22:
    case 23:
      return hi(), r = t.memoizedState !== null, e !== null && e.memoizedState !== null !== r && (t.flags |= 8192), r && t.mode & 1 ? ze & 1073741824 && (ye(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : ye(t), null;
    case 24:
      return null;
    case 25:
      return null;
  }
  throw Error(w(156, t.tag));
}
function _p(e, t) {
  switch (qs(t), t.tag) {
    case 1:
      return Le(t.type) && Pl(), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
    case 3:
      return Hn(), X(Ie), X(be), ri(), e = t.flags, e & 65536 && !(e & 128) ? (t.flags = e & -65537 | 128, t) : null;
    case 5:
      return ni(t), null;
    case 13:
      if (X(Z), e = t.memoizedState, e !== null && e.dehydrated !== null) {
        if (t.alternate === null) throw Error(w(340));
        Bn();
      }
      return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
    case 19:
      return X(Z), null;
    case 4:
      return Hn(), null;
    case 10:
      return Js(t.type._context), null;
    case 22:
    case 23:
      return hi(), null;
    case 24:
      return null;
    default:
      return null;
  }
}
var nl = false, xe = false, Tp = typeof WeakSet == "function" ? WeakSet : Set, T = null;
function In(e, t) {
  var n = e.ref;
  if (n !== null) if (typeof n == "function") try {
    n(null);
  } catch (r) {
    ne(e, t, r);
  }
  else n.current = null;
}
function Oc(e, t, n) {
  try {
    n();
  } catch (r) {
    ne(e, t, r);
  }
}
var So = false;
function Ip(e, t) {
  if (rs = Sl, e = Uu(), Vs(e)) {
    if ("selectionStart" in e) var n = { start: e.selectionStart, end: e.selectionEnd };
    else e: {
      n = (n = e.ownerDocument) && n.defaultView || window;
      var r = n.getSelection && n.getSelection();
      if (r && r.rangeCount !== 0) {
        n = r.anchorNode;
        var a = r.anchorOffset, s = r.focusNode;
        r = r.focusOffset;
        try {
          n.nodeType, s.nodeType;
        } catch {
          n = null;
          break e;
        }
        var i = 0, o = -1, u = -1, f = 0, v = 0, p = e, g = null;
        t: for (; ; ) {
          for (var m; p !== n || a !== 0 && p.nodeType !== 3 || (o = i + a), p !== s || r !== 0 && p.nodeType !== 3 || (u = i + r), p.nodeType === 3 && (i += p.nodeValue.length), (m = p.firstChild) !== null; ) g = p, p = m;
          for (; ; ) {
            if (p === e) break t;
            if (g === n && ++f === a && (o = i), g === s && ++v === r && (u = i), (m = p.nextSibling) !== null) break;
            p = g, g = p.parentNode;
          }
          p = m;
        }
        n = o === -1 || u === -1 ? null : { start: o, end: u };
      } else n = null;
    }
    n = n || { start: 0, end: 0 };
  } else n = null;
  for (ls = { focusedElem: e, selectionRange: n }, Sl = false, T = t; T !== null; ) if (t = T, e = t.child, (t.subtreeFlags & 1028) !== 0 && e !== null) e.return = t, T = e;
  else for (; T !== null; ) {
    t = T;
    try {
      var x = t.alternate;
      if (t.flags & 1024) switch (t.tag) {
        case 0:
        case 11:
        case 15:
          break;
        case 1:
          if (x !== null) {
            var y = x.memoizedProps, L = x.memoizedState, c = t.stateNode, d = c.getSnapshotBeforeUpdate(t.elementType === t.type ? y : Ye(t.type, y), L);
            c.__reactInternalSnapshotBeforeUpdate = d;
          }
          break;
        case 3:
          var h = t.stateNode.containerInfo;
          h.nodeType === 1 ? h.textContent = "" : h.nodeType === 9 && h.documentElement && h.removeChild(h.documentElement);
          break;
        case 5:
        case 6:
        case 4:
        case 17:
          break;
        default:
          throw Error(w(163));
      }
    } catch (b) {
      ne(t, t.return, b);
    }
    if (e = t.sibling, e !== null) {
      e.return = t.return, T = e;
      break;
    }
    T = t.return;
  }
  return x = So, So = false, x;
}
function gr(e, t, n) {
  var r = t.updateQueue;
  if (r = r !== null ? r.lastEffect : null, r !== null) {
    var a = r = r.next;
    do {
      if ((a.tag & e) === e) {
        var s = a.destroy;
        a.destroy = void 0, s !== void 0 && Oc(t, n, s);
      }
      a = a.next;
    } while (a !== r);
  }
}
function ta(e, t) {
  if (t = t.updateQueue, t = t !== null ? t.lastEffect : null, t !== null) {
    var n = t = t.next;
    do {
      if ((n.tag & e) === e) {
        var r = n.create;
        n.destroy = r();
      }
      n = n.next;
    } while (n !== t);
  }
}
function bs(e) {
  var t = e.ref;
  if (t !== null) {
    var n = e.stateNode;
    switch (e.tag) {
      case 5:
        e = n;
        break;
      default:
        e = n;
    }
    typeof t == "function" ? t(e) : t.current = e;
  }
}
function Rc(e) {
  var t = e.alternate;
  t !== null && (e.alternate = null, Rc(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && (delete t[ot], delete t[Tr], delete t[is], delete t[pp], delete t[hp])), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
}
function zc(e) {
  return e.tag === 5 || e.tag === 3 || e.tag === 4;
}
function Co(e) {
  e: for (; ; ) {
    for (; e.sibling === null; ) {
      if (e.return === null || zc(e.return)) return null;
      e = e.return;
    }
    for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18; ) {
      if (e.flags & 2 || e.child === null || e.tag === 4) continue e;
      e.child.return = e, e = e.child;
    }
    if (!(e.flags & 2)) return e.stateNode;
  }
}
function js(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6) e = e.stateNode, t ? n.nodeType === 8 ? n.parentNode.insertBefore(e, t) : n.insertBefore(e, t) : (n.nodeType === 8 ? (t = n.parentNode, t.insertBefore(e, n)) : (t = n, t.appendChild(e)), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = El));
  else if (r !== 4 && (e = e.child, e !== null)) for (js(e, t, n), e = e.sibling; e !== null; ) js(e, t, n), e = e.sibling;
}
function ws(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6) e = e.stateNode, t ? n.insertBefore(e, t) : n.appendChild(e);
  else if (r !== 4 && (e = e.child, e !== null)) for (ws(e, t, n), e = e.sibling; e !== null; ) ws(e, t, n), e = e.sibling;
}
var he = null, Xe = false;
function zt(e, t, n) {
  for (n = n.child; n !== null; ) Fc(e, t, n), n = n.sibling;
}
function Fc(e, t, n) {
  if (ut && typeof ut.onCommitFiberUnmount == "function") try {
    ut.onCommitFiberUnmount(Kl, n);
  } catch {
  }
  switch (n.tag) {
    case 5:
      xe || In(n, t);
    case 6:
      var r = he, a = Xe;
      he = null, zt(e, t, n), he = r, Xe = a, he !== null && (Xe ? (e = he, n = n.stateNode, e.nodeType === 8 ? e.parentNode.removeChild(n) : e.removeChild(n)) : he.removeChild(n.stateNode));
      break;
    case 18:
      he !== null && (Xe ? (e = he, n = n.stateNode, e.nodeType === 8 ? Sa(e.parentNode, n) : e.nodeType === 1 && Sa(e, n), Cr(e)) : Sa(he, n.stateNode));
      break;
    case 4:
      r = he, a = Xe, he = n.stateNode.containerInfo, Xe = true, zt(e, t, n), he = r, Xe = a;
      break;
    case 0:
    case 11:
    case 14:
    case 15:
      if (!xe && (r = n.updateQueue, r !== null && (r = r.lastEffect, r !== null))) {
        a = r = r.next;
        do {
          var s = a, i = s.destroy;
          s = s.tag, i !== void 0 && (s & 2 || s & 4) && Oc(n, t, i), a = a.next;
        } while (a !== r);
      }
      zt(e, t, n);
      break;
    case 1:
      if (!xe && (In(n, t), r = n.stateNode, typeof r.componentWillUnmount == "function")) try {
        r.props = n.memoizedProps, r.state = n.memoizedState, r.componentWillUnmount();
      } catch (o) {
        ne(n, t, o);
      }
      zt(e, t, n);
      break;
    case 21:
      zt(e, t, n);
      break;
    case 22:
      n.mode & 1 ? (xe = (r = xe) || n.memoizedState !== null, zt(e, t, n), xe = r) : zt(e, t, n);
      break;
    default:
      zt(e, t, n);
  }
}
function No(e) {
  var t = e.updateQueue;
  if (t !== null) {
    e.updateQueue = null;
    var n = e.stateNode;
    n === null && (n = e.stateNode = new Tp()), t.forEach(function(r) {
      var a = Dp.bind(null, e, r);
      n.has(r) || (n.add(r), r.then(a, a));
    });
  }
}
function Ge(e, t) {
  var n = t.deletions;
  if (n !== null) for (var r = 0; r < n.length; r++) {
    var a = n[r];
    try {
      var s = e, i = t, o = i;
      e: for (; o !== null; ) {
        switch (o.tag) {
          case 5:
            he = o.stateNode, Xe = false;
            break e;
          case 3:
            he = o.stateNode.containerInfo, Xe = true;
            break e;
          case 4:
            he = o.stateNode.containerInfo, Xe = true;
            break e;
        }
        o = o.return;
      }
      if (he === null) throw Error(w(160));
      Fc(s, i, a), he = null, Xe = false;
      var u = a.alternate;
      u !== null && (u.return = null), a.return = null;
    } catch (f) {
      ne(a, t, f);
    }
  }
  if (t.subtreeFlags & 12854) for (t = t.child; t !== null; ) Uc(t, e), t = t.sibling;
}
function Uc(e, t) {
  var n = e.alternate, r = e.flags;
  switch (e.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      if (Ge(t, e), st(e), r & 4) {
        try {
          gr(3, e, e.return), ta(3, e);
        } catch (y) {
          ne(e, e.return, y);
        }
        try {
          gr(5, e, e.return);
        } catch (y) {
          ne(e, e.return, y);
        }
      }
      break;
    case 1:
      Ge(t, e), st(e), r & 512 && n !== null && In(n, n.return);
      break;
    case 5:
      if (Ge(t, e), st(e), r & 512 && n !== null && In(n, n.return), e.flags & 32) {
        var a = e.stateNode;
        try {
          jr(a, "");
        } catch (y) {
          ne(e, e.return, y);
        }
      }
      if (r & 4 && (a = e.stateNode, a != null)) {
        var s = e.memoizedProps, i = n !== null ? n.memoizedProps : s, o = e.type, u = e.updateQueue;
        if (e.updateQueue = null, u !== null) try {
          o === "input" && s.type === "radio" && s.name != null && lu(a, s), Ka(o, i);
          var f = Ka(o, s);
          for (i = 0; i < u.length; i += 2) {
            var v = u[i], p = u[i + 1];
            v === "style" ? uu(a, p) : v === "dangerouslySetInnerHTML" ? iu(a, p) : v === "children" ? jr(a, p) : Os(a, v, p, f);
          }
          switch (o) {
            case "input":
              Ba(a, s);
              break;
            case "textarea":
              au(a, s);
              break;
            case "select":
              var g = a._wrapperState.wasMultiple;
              a._wrapperState.wasMultiple = !!s.multiple;
              var m = s.value;
              m != null ? On(a, !!s.multiple, m, false) : g !== !!s.multiple && (s.defaultValue != null ? On(a, !!s.multiple, s.defaultValue, true) : On(a, !!s.multiple, s.multiple ? [] : "", false));
          }
          a[Tr] = s;
        } catch (y) {
          ne(e, e.return, y);
        }
      }
      break;
    case 6:
      if (Ge(t, e), st(e), r & 4) {
        if (e.stateNode === null) throw Error(w(162));
        a = e.stateNode, s = e.memoizedProps;
        try {
          a.nodeValue = s;
        } catch (y) {
          ne(e, e.return, y);
        }
      }
      break;
    case 3:
      if (Ge(t, e), st(e), r & 4 && n !== null && n.memoizedState.isDehydrated) try {
        Cr(t.containerInfo);
      } catch (y) {
        ne(e, e.return, y);
      }
      break;
    case 4:
      Ge(t, e), st(e);
      break;
    case 13:
      Ge(t, e), st(e), a = e.child, a.flags & 8192 && (s = a.memoizedState !== null, a.stateNode.isHidden = s, !s || a.alternate !== null && a.alternate.memoizedState !== null || (fi = le())), r & 4 && No(e);
      break;
    case 22:
      if (v = n !== null && n.memoizedState !== null, e.mode & 1 ? (xe = (f = xe) || v, Ge(t, e), xe = f) : Ge(t, e), st(e), r & 8192) {
        if (f = e.memoizedState !== null, (e.stateNode.isHidden = f) && !v && e.mode & 1) for (T = e, v = e.child; v !== null; ) {
          for (p = T = v; T !== null; ) {
            switch (g = T, m = g.child, g.tag) {
              case 0:
              case 11:
              case 14:
              case 15:
                gr(4, g, g.return);
                break;
              case 1:
                In(g, g.return);
                var x = g.stateNode;
                if (typeof x.componentWillUnmount == "function") {
                  r = g, n = g.return;
                  try {
                    t = r, x.props = t.memoizedProps, x.state = t.memoizedState, x.componentWillUnmount();
                  } catch (y) {
                    ne(r, n, y);
                  }
                }
                break;
              case 5:
                In(g, g.return);
                break;
              case 22:
                if (g.memoizedState !== null) {
                  Po(p);
                  continue;
                }
            }
            m !== null ? (m.return = g, T = m) : Po(p);
          }
          v = v.sibling;
        }
        e: for (v = null, p = e; ; ) {
          if (p.tag === 5) {
            if (v === null) {
              v = p;
              try {
                a = p.stateNode, f ? (s = a.style, typeof s.setProperty == "function" ? s.setProperty("display", "none", "important") : s.display = "none") : (o = p.stateNode, u = p.memoizedProps.style, i = u != null && u.hasOwnProperty("display") ? u.display : null, o.style.display = ou("display", i));
              } catch (y) {
                ne(e, e.return, y);
              }
            }
          } else if (p.tag === 6) {
            if (v === null) try {
              p.stateNode.nodeValue = f ? "" : p.memoizedProps;
            } catch (y) {
              ne(e, e.return, y);
            }
          } else if ((p.tag !== 22 && p.tag !== 23 || p.memoizedState === null || p === e) && p.child !== null) {
            p.child.return = p, p = p.child;
            continue;
          }
          if (p === e) break e;
          for (; p.sibling === null; ) {
            if (p.return === null || p.return === e) break e;
            v === p && (v = null), p = p.return;
          }
          v === p && (v = null), p.sibling.return = p.return, p = p.sibling;
        }
      }
      break;
    case 19:
      Ge(t, e), st(e), r & 4 && No(e);
      break;
    case 21:
      break;
    default:
      Ge(t, e), st(e);
  }
}
function st(e) {
  var t = e.flags;
  if (t & 2) {
    try {
      e: {
        for (var n = e.return; n !== null; ) {
          if (zc(n)) {
            var r = n;
            break e;
          }
          n = n.return;
        }
        throw Error(w(160));
      }
      switch (r.tag) {
        case 5:
          var a = r.stateNode;
          r.flags & 32 && (jr(a, ""), r.flags &= -33);
          var s = Co(e);
          ws(e, s, a);
          break;
        case 3:
        case 4:
          var i = r.stateNode.containerInfo, o = Co(e);
          js(e, o, i);
          break;
        default:
          throw Error(w(161));
      }
    } catch (u) {
      ne(e, e.return, u);
    }
    e.flags &= -3;
  }
  t & 4096 && (e.flags &= -4097);
}
function Lp(e, t, n) {
  T = e, $c(e);
}
function $c(e, t, n) {
  for (var r = (e.mode & 1) !== 0; T !== null; ) {
    var a = T, s = a.child;
    if (a.tag === 22 && r) {
      var i = a.memoizedState !== null || nl;
      if (!i) {
        var o = a.alternate, u = o !== null && o.memoizedState !== null || xe;
        o = nl;
        var f = xe;
        if (nl = i, (xe = u) && !f) for (T = a; T !== null; ) i = T, u = i.child, i.tag === 22 && i.memoizedState !== null ? _o(a) : u !== null ? (u.return = i, T = u) : _o(a);
        for (; s !== null; ) T = s, $c(s), s = s.sibling;
        T = a, nl = o, xe = f;
      }
      Eo(e);
    } else a.subtreeFlags & 8772 && s !== null ? (s.return = a, T = s) : Eo(e);
  }
}
function Eo(e) {
  for (; T !== null; ) {
    var t = T;
    if (t.flags & 8772) {
      var n = t.alternate;
      try {
        if (t.flags & 8772) switch (t.tag) {
          case 0:
          case 11:
          case 15:
            xe || ta(5, t);
            break;
          case 1:
            var r = t.stateNode;
            if (t.flags & 4 && !xe) if (n === null) r.componentDidMount();
            else {
              var a = t.elementType === t.type ? n.memoizedProps : Ye(t.type, n.memoizedProps);
              r.componentDidUpdate(a, n.memoizedState, r.__reactInternalSnapshotBeforeUpdate);
            }
            var s = t.updateQueue;
            s !== null && co(t, s, r);
            break;
          case 3:
            var i = t.updateQueue;
            if (i !== null) {
              if (n = null, t.child !== null) switch (t.child.tag) {
                case 5:
                  n = t.child.stateNode;
                  break;
                case 1:
                  n = t.child.stateNode;
              }
              co(t, i, n);
            }
            break;
          case 5:
            var o = t.stateNode;
            if (n === null && t.flags & 4) {
              n = o;
              var u = t.memoizedProps;
              switch (t.type) {
                case "button":
                case "input":
                case "select":
                case "textarea":
                  u.autoFocus && n.focus();
                  break;
                case "img":
                  u.src && (n.src = u.src);
              }
            }
            break;
          case 6:
            break;
          case 4:
            break;
          case 12:
            break;
          case 13:
            if (t.memoizedState === null) {
              var f = t.alternate;
              if (f !== null) {
                var v = f.memoizedState;
                if (v !== null) {
                  var p = v.dehydrated;
                  p !== null && Cr(p);
                }
              }
            }
            break;
          case 19:
          case 17:
          case 21:
          case 22:
          case 23:
          case 25:
            break;
          default:
            throw Error(w(163));
        }
        xe || t.flags & 512 && bs(t);
      } catch (g) {
        ne(t, t.return, g);
      }
    }
    if (t === e) {
      T = null;
      break;
    }
    if (n = t.sibling, n !== null) {
      n.return = t.return, T = n;
      break;
    }
    T = t.return;
  }
}
function Po(e) {
  for (; T !== null; ) {
    var t = T;
    if (t === e) {
      T = null;
      break;
    }
    var n = t.sibling;
    if (n !== null) {
      n.return = t.return, T = n;
      break;
    }
    T = t.return;
  }
}
function _o(e) {
  for (; T !== null; ) {
    var t = T;
    try {
      switch (t.tag) {
        case 0:
        case 11:
        case 15:
          var n = t.return;
          try {
            ta(4, t);
          } catch (u) {
            ne(t, n, u);
          }
          break;
        case 1:
          var r = t.stateNode;
          if (typeof r.componentDidMount == "function") {
            var a = t.return;
            try {
              r.componentDidMount();
            } catch (u) {
              ne(t, a, u);
            }
          }
          var s = t.return;
          try {
            bs(t);
          } catch (u) {
            ne(t, s, u);
          }
          break;
        case 5:
          var i = t.return;
          try {
            bs(t);
          } catch (u) {
            ne(t, i, u);
          }
      }
    } catch (u) {
      ne(t, t.return, u);
    }
    if (t === e) {
      T = null;
      break;
    }
    var o = t.sibling;
    if (o !== null) {
      o.return = t.return, T = o;
      break;
    }
    T = t.return;
  }
}
var Op = Math.ceil, $l = Ot.ReactCurrentDispatcher, ci = Ot.ReactCurrentOwner, We = Ot.ReactCurrentBatchConfig, Q = 0, fe = null, ae = null, me = 0, ze = 0, Ln = en(0), ue = 0, Fr = null, gn = 0, na = 0, di = 0, vr = null, _e = null, fi = 0, Vn = 1 / 0, ht = null, Ml = false, ks = null, qt = null, rl = false, Bt = null, Dl = 0, yr = 0, Ss = null, gl = -1, vl = 0;
function Ce() {
  return Q & 6 ? le() : gl !== -1 ? gl : gl = le();
}
function Gt(e) {
  return e.mode & 1 ? Q & 2 && me !== 0 ? me & -me : gp.transition !== null ? (vl === 0 && (vl = ju()), vl) : (e = W, e !== 0 || (e = window.event, e = e === void 0 ? 16 : Pu(e.type)), e) : 1;
}
function nt(e, t, n, r) {
  if (50 < yr) throw yr = 0, Ss = null, Error(w(185));
  $r(e, n, r), (!(Q & 2) || e !== fe) && (e === fe && (!(Q & 2) && (na |= n), ue === 4 && Dt(e, me)), Oe(e, r), n === 1 && Q === 0 && !(t.mode & 1) && (Vn = le() + 500, Jl && tn()));
}
function Oe(e, t) {
  var n = e.callbackNode;
  gf(e, t);
  var r = kl(e, e === fe ? me : 0);
  if (r === 0) n !== null && Ui(n), e.callbackNode = null, e.callbackPriority = 0;
  else if (t = r & -r, e.callbackPriority !== t) {
    if (n != null && Ui(n), t === 1) e.tag === 0 ? mp(To.bind(null, e)) : Ku(To.bind(null, e)), dp(function() {
      !(Q & 6) && tn();
    }), n = null;
    else {
      switch (wu(r)) {
        case 1:
          n = $s;
          break;
        case 4:
          n = xu;
          break;
        case 16:
          n = wl;
          break;
        case 536870912:
          n = bu;
          break;
        default:
          n = wl;
      }
      n = Vc(n, Mc.bind(null, e));
    }
    e.callbackPriority = t, e.callbackNode = n;
  }
}
function Mc(e, t) {
  if (gl = -1, vl = 0, Q & 6) throw Error(w(327));
  var n = e.callbackNode;
  if ($n() && e.callbackNode !== n) return null;
  var r = kl(e, e === fe ? me : 0);
  if (r === 0) return null;
  if (r & 30 || r & e.expiredLanes || t) t = Al(e, r);
  else {
    t = r;
    var a = Q;
    Q |= 2;
    var s = Ac();
    (fe !== e || me !== t) && (ht = null, Vn = le() + 500, dn(e, t));
    do
      try {
        Fp();
        break;
      } catch (o) {
        Dc(e, o);
      }
    while (true);
    Xs(), $l.current = s, Q = a, ae !== null ? t = 0 : (fe = null, me = 0, t = ue);
  }
  if (t !== 0) {
    if (t === 2 && (a = Ja(e), a !== 0 && (r = a, t = Cs(e, a))), t === 1) throw n = Fr, dn(e, 0), Dt(e, r), Oe(e, le()), n;
    if (t === 6) Dt(e, r);
    else {
      if (a = e.current.alternate, !(r & 30) && !Rp(a) && (t = Al(e, r), t === 2 && (s = Ja(e), s !== 0 && (r = s, t = Cs(e, s))), t === 1)) throw n = Fr, dn(e, 0), Dt(e, r), Oe(e, le()), n;
      switch (e.finishedWork = a, e.finishedLanes = r, t) {
        case 0:
        case 1:
          throw Error(w(345));
        case 2:
          an(e, _e, ht);
          break;
        case 3:
          if (Dt(e, r), (r & 130023424) === r && (t = fi + 500 - le(), 10 < t)) {
            if (kl(e, 0) !== 0) break;
            if (a = e.suspendedLanes, (a & r) !== r) {
              Ce(), e.pingedLanes |= e.suspendedLanes & a;
              break;
            }
            e.timeoutHandle = ss(an.bind(null, e, _e, ht), t);
            break;
          }
          an(e, _e, ht);
          break;
        case 4:
          if (Dt(e, r), (r & 4194240) === r) break;
          for (t = e.eventTimes, a = -1; 0 < r; ) {
            var i = 31 - tt(r);
            s = 1 << i, i = t[i], i > a && (a = i), r &= ~s;
          }
          if (r = a, r = le() - r, r = (120 > r ? 120 : 480 > r ? 480 : 1080 > r ? 1080 : 1920 > r ? 1920 : 3e3 > r ? 3e3 : 4320 > r ? 4320 : 1960 * Op(r / 1960)) - r, 10 < r) {
            e.timeoutHandle = ss(an.bind(null, e, _e, ht), r);
            break;
          }
          an(e, _e, ht);
          break;
        case 5:
          an(e, _e, ht);
          break;
        default:
          throw Error(w(329));
      }
    }
  }
  return Oe(e, le()), e.callbackNode === n ? Mc.bind(null, e) : null;
}
function Cs(e, t) {
  var n = vr;
  return e.current.memoizedState.isDehydrated && (dn(e, t).flags |= 256), e = Al(e, t), e !== 2 && (t = _e, _e = n, t !== null && Ns(t)), e;
}
function Ns(e) {
  _e === null ? _e = e : _e.push.apply(_e, e);
}
function Rp(e) {
  for (var t = e; ; ) {
    if (t.flags & 16384) {
      var n = t.updateQueue;
      if (n !== null && (n = n.stores, n !== null)) for (var r = 0; r < n.length; r++) {
        var a = n[r], s = a.getSnapshot;
        a = a.value;
        try {
          if (!rt(s(), a)) return false;
        } catch {
          return false;
        }
      }
    }
    if (n = t.child, t.subtreeFlags & 16384 && n !== null) n.return = t, t = n;
    else {
      if (t === e) break;
      for (; t.sibling === null; ) {
        if (t.return === null || t.return === e) return true;
        t = t.return;
      }
      t.sibling.return = t.return, t = t.sibling;
    }
  }
  return true;
}
function Dt(e, t) {
  for (t &= ~di, t &= ~na, e.suspendedLanes |= t, e.pingedLanes &= ~t, e = e.expirationTimes; 0 < t; ) {
    var n = 31 - tt(t), r = 1 << n;
    e[n] = -1, t &= ~r;
  }
}
function To(e) {
  if (Q & 6) throw Error(w(327));
  $n();
  var t = kl(e, 0);
  if (!(t & 1)) return Oe(e, le()), null;
  var n = Al(e, t);
  if (e.tag !== 0 && n === 2) {
    var r = Ja(e);
    r !== 0 && (t = r, n = Cs(e, r));
  }
  if (n === 1) throw n = Fr, dn(e, 0), Dt(e, t), Oe(e, le()), n;
  if (n === 6) throw Error(w(345));
  return e.finishedWork = e.current.alternate, e.finishedLanes = t, an(e, _e, ht), Oe(e, le()), null;
}
function pi(e, t) {
  var n = Q;
  Q |= 1;
  try {
    return e(t);
  } finally {
    Q = n, Q === 0 && (Vn = le() + 500, Jl && tn());
  }
}
function vn(e) {
  Bt !== null && Bt.tag === 0 && !(Q & 6) && $n();
  var t = Q;
  Q |= 1;
  var n = We.transition, r = W;
  try {
    if (We.transition = null, W = 1, e) return e();
  } finally {
    W = r, We.transition = n, Q = t, !(Q & 6) && tn();
  }
}
function hi() {
  ze = Ln.current, X(Ln);
}
function dn(e, t) {
  e.finishedWork = null, e.finishedLanes = 0;
  var n = e.timeoutHandle;
  if (n !== -1 && (e.timeoutHandle = -1, cp(n)), ae !== null) for (n = ae.return; n !== null; ) {
    var r = n;
    switch (qs(r), r.tag) {
      case 1:
        r = r.type.childContextTypes, r != null && Pl();
        break;
      case 3:
        Hn(), X(Ie), X(be), ri();
        break;
      case 5:
        ni(r);
        break;
      case 4:
        Hn();
        break;
      case 13:
        X(Z);
        break;
      case 19:
        X(Z);
        break;
      case 10:
        Js(r.type._context);
        break;
      case 22:
      case 23:
        hi();
    }
    n = n.return;
  }
  if (fe = e, ae = e = Yt(e.current, null), me = ze = t, ue = 0, Fr = null, di = na = gn = 0, _e = vr = null, on !== null) {
    for (t = 0; t < on.length; t++) if (n = on[t], r = n.interleaved, r !== null) {
      n.interleaved = null;
      var a = r.next, s = n.pending;
      if (s !== null) {
        var i = s.next;
        s.next = a, r.next = i;
      }
      n.pending = r;
    }
    on = null;
  }
  return e;
}
function Dc(e, t) {
  do {
    var n = ae;
    try {
      if (Xs(), pl.current = Ul, Fl) {
        for (var r = ee.memoizedState; r !== null; ) {
          var a = r.queue;
          a !== null && (a.pending = null), r = r.next;
        }
        Fl = false;
      }
      if (mn = 0, de = oe = ee = null, mr = false, Or = 0, ci.current = null, n === null || n.return === null) {
        ue = 1, Fr = t, ae = null;
        break;
      }
      e: {
        var s = e, i = n.return, o = n, u = t;
        if (t = me, o.flags |= 32768, u !== null && typeof u == "object" && typeof u.then == "function") {
          var f = u, v = o, p = v.tag;
          if (!(v.mode & 1) && (p === 0 || p === 11 || p === 15)) {
            var g = v.alternate;
            g ? (v.updateQueue = g.updateQueue, v.memoizedState = g.memoizedState, v.lanes = g.lanes) : (v.updateQueue = null, v.memoizedState = null);
          }
          var m = vo(i);
          if (m !== null) {
            m.flags &= -257, yo(m, i, o, s, t), m.mode & 1 && go(s, f, t), t = m, u = f;
            var x = t.updateQueue;
            if (x === null) {
              var y = /* @__PURE__ */ new Set();
              y.add(u), t.updateQueue = y;
            } else x.add(u);
            break e;
          } else {
            if (!(t & 1)) {
              go(s, f, t), mi();
              break e;
            }
            u = Error(w(426));
          }
        } else if (J && o.mode & 1) {
          var L = vo(i);
          if (L !== null) {
            !(L.flags & 65536) && (L.flags |= 256), yo(L, i, o, s, t), Gs(Wn(u, o));
            break e;
          }
        }
        s = u = Wn(u, o), ue !== 4 && (ue = 2), vr === null ? vr = [s] : vr.push(s), s = i;
        do {
          switch (s.tag) {
            case 3:
              s.flags |= 65536, t &= -t, s.lanes |= t;
              var c = wc(s, u, t);
              uo(s, c);
              break e;
            case 1:
              o = u;
              var d = s.type, h = s.stateNode;
              if (!(s.flags & 128) && (typeof d.getDerivedStateFromError == "function" || h !== null && typeof h.componentDidCatch == "function" && (qt === null || !qt.has(h)))) {
                s.flags |= 65536, t &= -t, s.lanes |= t;
                var b = kc(s, o, t);
                uo(s, b);
                break e;
              }
          }
          s = s.return;
        } while (s !== null);
      }
      Qc(n);
    } catch (S) {
      t = S, ae === n && n !== null && (ae = n = n.return);
      continue;
    }
    break;
  } while (true);
}
function Ac() {
  var e = $l.current;
  return $l.current = Ul, e === null ? Ul : e;
}
function mi() {
  (ue === 0 || ue === 3 || ue === 2) && (ue = 4), fe === null || !(gn & 268435455) && !(na & 268435455) || Dt(fe, me);
}
function Al(e, t) {
  var n = Q;
  Q |= 2;
  var r = Ac();
  (fe !== e || me !== t) && (ht = null, dn(e, t));
  do
    try {
      zp();
      break;
    } catch (a) {
      Dc(e, a);
    }
  while (true);
  if (Xs(), Q = n, $l.current = r, ae !== null) throw Error(w(261));
  return fe = null, me = 0, ue;
}
function zp() {
  for (; ae !== null; ) Bc(ae);
}
function Fp() {
  for (; ae !== null && !sf(); ) Bc(ae);
}
function Bc(e) {
  var t = Wc(e.alternate, e, ze);
  e.memoizedProps = e.pendingProps, t === null ? Qc(e) : ae = t, ci.current = null;
}
function Qc(e) {
  var t = e;
  do {
    var n = t.alternate;
    if (e = t.return, t.flags & 32768) {
      if (n = _p(n, t), n !== null) {
        n.flags &= 32767, ae = n;
        return;
      }
      if (e !== null) e.flags |= 32768, e.subtreeFlags = 0, e.deletions = null;
      else {
        ue = 6, ae = null;
        return;
      }
    } else if (n = Pp(n, t, ze), n !== null) {
      ae = n;
      return;
    }
    if (t = t.sibling, t !== null) {
      ae = t;
      return;
    }
    ae = t = e;
  } while (t !== null);
  ue === 0 && (ue = 5);
}
function an(e, t, n) {
  var r = W, a = We.transition;
  try {
    We.transition = null, W = 1, Up(e, t, n, r);
  } finally {
    We.transition = a, W = r;
  }
  return null;
}
function Up(e, t, n, r) {
  do
    $n();
  while (Bt !== null);
  if (Q & 6) throw Error(w(327));
  n = e.finishedWork;
  var a = e.finishedLanes;
  if (n === null) return null;
  if (e.finishedWork = null, e.finishedLanes = 0, n === e.current) throw Error(w(177));
  e.callbackNode = null, e.callbackPriority = 0;
  var s = n.lanes | n.childLanes;
  if (vf(e, s), e === fe && (ae = fe = null, me = 0), !(n.subtreeFlags & 2064) && !(n.flags & 2064) || rl || (rl = true, Vc(wl, function() {
    return $n(), null;
  })), s = (n.flags & 15990) !== 0, n.subtreeFlags & 15990 || s) {
    s = We.transition, We.transition = null;
    var i = W;
    W = 1;
    var o = Q;
    Q |= 4, ci.current = null, Ip(e, n), Uc(n, e), rp(ls), Sl = !!rs, ls = rs = null, e.current = n, Lp(n), of(), Q = o, W = i, We.transition = s;
  } else e.current = n;
  if (rl && (rl = false, Bt = e, Dl = a), s = e.pendingLanes, s === 0 && (qt = null), df(n.stateNode), Oe(e, le()), t !== null) for (r = e.onRecoverableError, n = 0; n < t.length; n++) a = t[n], r(a.value, { componentStack: a.stack, digest: a.digest });
  if (Ml) throw Ml = false, e = ks, ks = null, e;
  return Dl & 1 && e.tag !== 0 && $n(), s = e.pendingLanes, s & 1 ? e === Ss ? yr++ : (yr = 0, Ss = e) : yr = 0, tn(), null;
}
function $n() {
  if (Bt !== null) {
    var e = wu(Dl), t = We.transition, n = W;
    try {
      if (We.transition = null, W = 16 > e ? 16 : e, Bt === null) var r = false;
      else {
        if (e = Bt, Bt = null, Dl = 0, Q & 6) throw Error(w(331));
        var a = Q;
        for (Q |= 4, T = e.current; T !== null; ) {
          var s = T, i = s.child;
          if (T.flags & 16) {
            var o = s.deletions;
            if (o !== null) {
              for (var u = 0; u < o.length; u++) {
                var f = o[u];
                for (T = f; T !== null; ) {
                  var v = T;
                  switch (v.tag) {
                    case 0:
                    case 11:
                    case 15:
                      gr(8, v, s);
                  }
                  var p = v.child;
                  if (p !== null) p.return = v, T = p;
                  else for (; T !== null; ) {
                    v = T;
                    var g = v.sibling, m = v.return;
                    if (Rc(v), v === f) {
                      T = null;
                      break;
                    }
                    if (g !== null) {
                      g.return = m, T = g;
                      break;
                    }
                    T = m;
                  }
                }
              }
              var x = s.alternate;
              if (x !== null) {
                var y = x.child;
                if (y !== null) {
                  x.child = null;
                  do {
                    var L = y.sibling;
                    y.sibling = null, y = L;
                  } while (y !== null);
                }
              }
              T = s;
            }
          }
          if (s.subtreeFlags & 2064 && i !== null) i.return = s, T = i;
          else e: for (; T !== null; ) {
            if (s = T, s.flags & 2048) switch (s.tag) {
              case 0:
              case 11:
              case 15:
                gr(9, s, s.return);
            }
            var c = s.sibling;
            if (c !== null) {
              c.return = s.return, T = c;
              break e;
            }
            T = s.return;
          }
        }
        var d = e.current;
        for (T = d; T !== null; ) {
          i = T;
          var h = i.child;
          if (i.subtreeFlags & 2064 && h !== null) h.return = i, T = h;
          else e: for (i = d; T !== null; ) {
            if (o = T, o.flags & 2048) try {
              switch (o.tag) {
                case 0:
                case 11:
                case 15:
                  ta(9, o);
              }
            } catch (S) {
              ne(o, o.return, S);
            }
            if (o === i) {
              T = null;
              break e;
            }
            var b = o.sibling;
            if (b !== null) {
              b.return = o.return, T = b;
              break e;
            }
            T = o.return;
          }
        }
        if (Q = a, tn(), ut && typeof ut.onPostCommitFiberRoot == "function") try {
          ut.onPostCommitFiberRoot(Kl, e);
        } catch {
        }
        r = true;
      }
      return r;
    } finally {
      W = n, We.transition = t;
    }
  }
  return false;
}
function Io(e, t, n) {
  t = Wn(n, t), t = wc(e, t, 1), e = Kt(e, t, 1), t = Ce(), e !== null && ($r(e, 1, t), Oe(e, t));
}
function ne(e, t, n) {
  if (e.tag === 3) Io(e, e, n);
  else for (; t !== null; ) {
    if (t.tag === 3) {
      Io(t, e, n);
      break;
    } else if (t.tag === 1) {
      var r = t.stateNode;
      if (typeof t.type.getDerivedStateFromError == "function" || typeof r.componentDidCatch == "function" && (qt === null || !qt.has(r))) {
        e = Wn(n, e), e = kc(t, e, 1), t = Kt(t, e, 1), e = Ce(), t !== null && ($r(t, 1, e), Oe(t, e));
        break;
      }
    }
    t = t.return;
  }
}
function $p(e, t, n) {
  var r = e.pingCache;
  r !== null && r.delete(t), t = Ce(), e.pingedLanes |= e.suspendedLanes & n, fe === e && (me & n) === n && (ue === 4 || ue === 3 && (me & 130023424) === me && 500 > le() - fi ? dn(e, 0) : di |= n), Oe(e, t);
}
function Hc(e, t) {
  t === 0 && (e.mode & 1 ? (t = Kr, Kr <<= 1, !(Kr & 130023424) && (Kr = 4194304)) : t = 1);
  var n = Ce();
  e = wt(e, t), e !== null && ($r(e, t, n), Oe(e, n));
}
function Mp(e) {
  var t = e.memoizedState, n = 0;
  t !== null && (n = t.retryLane), Hc(e, n);
}
function Dp(e, t) {
  var n = 0;
  switch (e.tag) {
    case 13:
      var r = e.stateNode, a = e.memoizedState;
      a !== null && (n = a.retryLane);
      break;
    case 19:
      r = e.stateNode;
      break;
    default:
      throw Error(w(314));
  }
  r !== null && r.delete(t), Hc(e, n);
}
var Wc;
Wc = function(e, t, n) {
  if (e !== null) if (e.memoizedProps !== t.pendingProps || Ie.current) Te = true;
  else {
    if (!(e.lanes & n) && !(t.flags & 128)) return Te = false, Ep(e, t, n);
    Te = !!(e.flags & 131072);
  }
  else Te = false, J && t.flags & 1048576 && qu(t, Il, t.index);
  switch (t.lanes = 0, t.tag) {
    case 2:
      var r = t.type;
      ml(e, t), e = t.pendingProps;
      var a = An(t, be.current);
      Un(t, n), a = ai(null, t, r, e, a, n);
      var s = si();
      return t.flags |= 1, typeof a == "object" && a !== null && typeof a.render == "function" && a.$$typeof === void 0 ? (t.tag = 1, t.memoizedState = null, t.updateQueue = null, Le(r) ? (s = true, _l(t)) : s = false, t.memoizedState = a.state !== null && a.state !== void 0 ? a.state : null, ei(t), a.updater = ea, t.stateNode = a, a._reactInternals = t, ps(t, r, e, n), t = gs(null, t, r, true, s, n)) : (t.tag = 0, J && s && Ks(t), Se(null, t, a, n), t = t.child), t;
    case 16:
      r = t.elementType;
      e: {
        switch (ml(e, t), e = t.pendingProps, a = r._init, r = a(r._payload), t.type = r, a = t.tag = Bp(r), e = Ye(r, e), a) {
          case 0:
            t = ms(null, t, r, e, n);
            break e;
          case 1:
            t = jo(null, t, r, e, n);
            break e;
          case 11:
            t = xo(null, t, r, e, n);
            break e;
          case 14:
            t = bo(null, t, r, Ye(r.type, e), n);
            break e;
        }
        throw Error(w(306, r, ""));
      }
      return t;
    case 0:
      return r = t.type, a = t.pendingProps, a = t.elementType === r ? a : Ye(r, a), ms(e, t, r, a, n);
    case 1:
      return r = t.type, a = t.pendingProps, a = t.elementType === r ? a : Ye(r, a), jo(e, t, r, a, n);
    case 3:
      e: {
        if (Ec(t), e === null) throw Error(w(387));
        r = t.pendingProps, s = t.memoizedState, a = s.element, ec(e, t), Rl(t, r, null, n);
        var i = t.memoizedState;
        if (r = i.element, s.isDehydrated) if (s = { element: r, isDehydrated: false, cache: i.cache, pendingSuspenseBoundaries: i.pendingSuspenseBoundaries, transitions: i.transitions }, t.updateQueue.baseState = s, t.memoizedState = s, t.flags & 256) {
          a = Wn(Error(w(423)), t), t = wo(e, t, r, n, a);
          break e;
        } else if (r !== a) {
          a = Wn(Error(w(424)), t), t = wo(e, t, r, n, a);
          break e;
        } else for (Fe = Vt(t.stateNode.containerInfo.firstChild), Ue = t, J = true, Ze = null, n = Ju(t, null, r, n), t.child = n; n; ) n.flags = n.flags & -3 | 4096, n = n.sibling;
        else {
          if (Bn(), r === a) {
            t = kt(e, t, n);
            break e;
          }
          Se(e, t, r, n);
        }
        t = t.child;
      }
      return t;
    case 5:
      return tc(t), e === null && cs(t), r = t.type, a = t.pendingProps, s = e !== null ? e.memoizedProps : null, i = a.children, as(r, a) ? i = null : s !== null && as(r, s) && (t.flags |= 32), Nc(e, t), Se(e, t, i, n), t.child;
    case 6:
      return e === null && cs(t), null;
    case 13:
      return Pc(e, t, n);
    case 4:
      return ti(t, t.stateNode.containerInfo), r = t.pendingProps, e === null ? t.child = Qn(t, null, r, n) : Se(e, t, r, n), t.child;
    case 11:
      return r = t.type, a = t.pendingProps, a = t.elementType === r ? a : Ye(r, a), xo(e, t, r, a, n);
    case 7:
      return Se(e, t, t.pendingProps, n), t.child;
    case 8:
      return Se(e, t, t.pendingProps.children, n), t.child;
    case 12:
      return Se(e, t, t.pendingProps.children, n), t.child;
    case 10:
      e: {
        if (r = t.type._context, a = t.pendingProps, s = t.memoizedProps, i = a.value, q(Ll, r._currentValue), r._currentValue = i, s !== null) if (rt(s.value, i)) {
          if (s.children === a.children && !Ie.current) {
            t = kt(e, t, n);
            break e;
          }
        } else for (s = t.child, s !== null && (s.return = t); s !== null; ) {
          var o = s.dependencies;
          if (o !== null) {
            i = s.child;
            for (var u = o.firstContext; u !== null; ) {
              if (u.context === r) {
                if (s.tag === 1) {
                  u = yt(-1, n & -n), u.tag = 2;
                  var f = s.updateQueue;
                  if (f !== null) {
                    f = f.shared;
                    var v = f.pending;
                    v === null ? u.next = u : (u.next = v.next, v.next = u), f.pending = u;
                  }
                }
                s.lanes |= n, u = s.alternate, u !== null && (u.lanes |= n), ds(s.return, n, t), o.lanes |= n;
                break;
              }
              u = u.next;
            }
          } else if (s.tag === 10) i = s.type === t.type ? null : s.child;
          else if (s.tag === 18) {
            if (i = s.return, i === null) throw Error(w(341));
            i.lanes |= n, o = i.alternate, o !== null && (o.lanes |= n), ds(i, n, t), i = s.sibling;
          } else i = s.child;
          if (i !== null) i.return = s;
          else for (i = s; i !== null; ) {
            if (i === t) {
              i = null;
              break;
            }
            if (s = i.sibling, s !== null) {
              s.return = i.return, i = s;
              break;
            }
            i = i.return;
          }
          s = i;
        }
        Se(e, t, a.children, n), t = t.child;
      }
      return t;
    case 9:
      return a = t.type, r = t.pendingProps.children, Un(t, n), a = Ve(a), r = r(a), t.flags |= 1, Se(e, t, r, n), t.child;
    case 14:
      return r = t.type, a = Ye(r, t.pendingProps), a = Ye(r.type, a), bo(e, t, r, a, n);
    case 15:
      return Sc(e, t, t.type, t.pendingProps, n);
    case 17:
      return r = t.type, a = t.pendingProps, a = t.elementType === r ? a : Ye(r, a), ml(e, t), t.tag = 1, Le(r) ? (e = true, _l(t)) : e = false, Un(t, n), jc(t, r, a), ps(t, r, a, n), gs(null, t, r, true, e, n);
    case 19:
      return _c(e, t, n);
    case 22:
      return Cc(e, t, n);
  }
  throw Error(w(156, t.tag));
};
function Vc(e, t) {
  return yu(e, t);
}
function Ap(e, t, n, r) {
  this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = r, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
}
function He(e, t, n, r) {
  return new Ap(e, t, n, r);
}
function gi(e) {
  return e = e.prototype, !(!e || !e.isReactComponent);
}
function Bp(e) {
  if (typeof e == "function") return gi(e) ? 1 : 0;
  if (e != null) {
    if (e = e.$$typeof, e === zs) return 11;
    if (e === Fs) return 14;
  }
  return 2;
}
function Yt(e, t) {
  var n = e.alternate;
  return n === null ? (n = He(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 14680064, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n;
}
function yl(e, t, n, r, a, s) {
  var i = 2;
  if (r = e, typeof e == "function") gi(e) && (i = 1);
  else if (typeof e == "string") i = 5;
  else e: switch (e) {
    case wn:
      return fn(n.children, a, s, t);
    case Rs:
      i = 8, a |= 8;
      break;
    case Ua:
      return e = He(12, n, t, a | 2), e.elementType = Ua, e.lanes = s, e;
    case $a:
      return e = He(13, n, t, a), e.elementType = $a, e.lanes = s, e;
    case Ma:
      return e = He(19, n, t, a), e.elementType = Ma, e.lanes = s, e;
    case tu:
      return ra(n, a, s, t);
    default:
      if (typeof e == "object" && e !== null) switch (e.$$typeof) {
        case Zo:
          i = 10;
          break e;
        case eu:
          i = 9;
          break e;
        case zs:
          i = 11;
          break e;
        case Fs:
          i = 14;
          break e;
        case Ut:
          i = 16, r = null;
          break e;
      }
      throw Error(w(130, e == null ? e : typeof e, ""));
  }
  return t = He(i, n, t, a), t.elementType = e, t.type = r, t.lanes = s, t;
}
function fn(e, t, n, r) {
  return e = He(7, e, r, t), e.lanes = n, e;
}
function ra(e, t, n, r) {
  return e = He(22, e, r, t), e.elementType = tu, e.lanes = n, e.stateNode = { isHidden: false }, e;
}
function La(e, t, n) {
  return e = He(6, e, null, t), e.lanes = n, e;
}
function Oa(e, t, n) {
  return t = He(4, e.children !== null ? e.children : [], e.key, t), t.lanes = n, t.stateNode = { containerInfo: e.containerInfo, pendingChildren: null, implementation: e.implementation }, t;
}
function Qp(e, t, n, r, a) {
  this.tag = t, this.containerInfo = e, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = pa(0), this.expirationTimes = pa(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = pa(0), this.identifierPrefix = r, this.onRecoverableError = a, this.mutableSourceEagerHydrationData = null;
}
function vi(e, t, n, r, a, s, i, o, u) {
  return e = new Qp(e, t, n, o, u), t === 1 ? (t = 1, s === true && (t |= 8)) : t = 0, s = He(3, null, null, t), e.current = s, s.stateNode = e, s.memoizedState = { element: r, isDehydrated: n, cache: null, transitions: null, pendingSuspenseBoundaries: null }, ei(s), e;
}
function Hp(e, t, n) {
  var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
  return { $$typeof: jn, key: r == null ? null : "" + r, children: e, containerInfo: t, implementation: n };
}
function Kc(e) {
  if (!e) return Jt;
  e = e._reactInternals;
  e: {
    if (xn(e) !== e || e.tag !== 1) throw Error(w(170));
    var t = e;
    do {
      switch (t.tag) {
        case 3:
          t = t.stateNode.context;
          break e;
        case 1:
          if (Le(t.type)) {
            t = t.stateNode.__reactInternalMemoizedMergedChildContext;
            break e;
          }
      }
      t = t.return;
    } while (t !== null);
    throw Error(w(171));
  }
  if (e.tag === 1) {
    var n = e.type;
    if (Le(n)) return Vu(e, n, t);
  }
  return t;
}
function qc(e, t, n, r, a, s, i, o, u) {
  return e = vi(n, r, true, e, a, s, i, o, u), e.context = Kc(null), n = e.current, r = Ce(), a = Gt(n), s = yt(r, a), s.callback = t ?? null, Kt(n, s, a), e.current.lanes = a, $r(e, a, r), Oe(e, r), e;
}
function la(e, t, n, r) {
  var a = t.current, s = Ce(), i = Gt(a);
  return n = Kc(n), t.context === null ? t.context = n : t.pendingContext = n, t = yt(s, i), t.payload = { element: e }, r = r === void 0 ? null : r, r !== null && (t.callback = r), e = Kt(a, t, i), e !== null && (nt(e, a, i, s), fl(e, a, i)), i;
}
function Bl(e) {
  if (e = e.current, !e.child) return null;
  switch (e.child.tag) {
    case 5:
      return e.child.stateNode;
    default:
      return e.child.stateNode;
  }
}
function Lo(e, t) {
  if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
    var n = e.retryLane;
    e.retryLane = n !== 0 && n < t ? n : t;
  }
}
function yi(e, t) {
  Lo(e, t), (e = e.alternate) && Lo(e, t);
}
function Wp() {
  return null;
}
var Gc = typeof reportError == "function" ? reportError : function(e) {
  console.error(e);
};
function xi(e) {
  this._internalRoot = e;
}
aa.prototype.render = xi.prototype.render = function(e) {
  var t = this._internalRoot;
  if (t === null) throw Error(w(409));
  la(e, t, null, null);
};
aa.prototype.unmount = xi.prototype.unmount = function() {
  var e = this._internalRoot;
  if (e !== null) {
    this._internalRoot = null;
    var t = e.containerInfo;
    vn(function() {
      la(null, e, null, null);
    }), t[jt] = null;
  }
};
function aa(e) {
  this._internalRoot = e;
}
aa.prototype.unstable_scheduleHydration = function(e) {
  if (e) {
    var t = Cu();
    e = { blockedOn: null, target: e, priority: t };
    for (var n = 0; n < Mt.length && t !== 0 && t < Mt[n].priority; n++) ;
    Mt.splice(n, 0, e), n === 0 && Eu(e);
  }
};
function bi(e) {
  return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
}
function sa(e) {
  return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11 && (e.nodeType !== 8 || e.nodeValue !== " react-mount-point-unstable "));
}
function Oo() {
}
function Vp(e, t, n, r, a) {
  if (a) {
    if (typeof r == "function") {
      var s = r;
      r = function() {
        var f = Bl(i);
        s.call(f);
      };
    }
    var i = qc(t, r, e, 0, null, false, false, "", Oo);
    return e._reactRootContainer = i, e[jt] = i.current, Pr(e.nodeType === 8 ? e.parentNode : e), vn(), i;
  }
  for (; a = e.lastChild; ) e.removeChild(a);
  if (typeof r == "function") {
    var o = r;
    r = function() {
      var f = Bl(u);
      o.call(f);
    };
  }
  var u = vi(e, 0, false, null, null, false, false, "", Oo);
  return e._reactRootContainer = u, e[jt] = u.current, Pr(e.nodeType === 8 ? e.parentNode : e), vn(function() {
    la(t, u, n, r);
  }), u;
}
function ia(e, t, n, r, a) {
  var s = n._reactRootContainer;
  if (s) {
    var i = s;
    if (typeof a == "function") {
      var o = a;
      a = function() {
        var u = Bl(i);
        o.call(u);
      };
    }
    la(t, i, e, a);
  } else i = Vp(n, t, e, a, r);
  return Bl(i);
}
ku = function(e) {
  switch (e.tag) {
    case 3:
      var t = e.stateNode;
      if (t.current.memoizedState.isDehydrated) {
        var n = or(t.pendingLanes);
        n !== 0 && (Ms(t, n | 1), Oe(t, le()), !(Q & 6) && (Vn = le() + 500, tn()));
      }
      break;
    case 13:
      vn(function() {
        var r = wt(e, 1);
        if (r !== null) {
          var a = Ce();
          nt(r, e, 1, a);
        }
      }), yi(e, 1);
  }
};
Ds = function(e) {
  if (e.tag === 13) {
    var t = wt(e, 134217728);
    if (t !== null) {
      var n = Ce();
      nt(t, e, 134217728, n);
    }
    yi(e, 134217728);
  }
};
Su = function(e) {
  if (e.tag === 13) {
    var t = Gt(e), n = wt(e, t);
    if (n !== null) {
      var r = Ce();
      nt(n, e, t, r);
    }
    yi(e, t);
  }
};
Cu = function() {
  return W;
};
Nu = function(e, t) {
  var n = W;
  try {
    return W = e, t();
  } finally {
    W = n;
  }
};
Ga = function(e, t, n) {
  switch (t) {
    case "input":
      if (Ba(e, n), t = n.name, n.type === "radio" && t != null) {
        for (n = e; n.parentNode; ) n = n.parentNode;
        for (n = n.querySelectorAll("input[name=" + JSON.stringify("" + t) + '][type="radio"]'), t = 0; t < n.length; t++) {
          var r = n[t];
          if (r !== e && r.form === e.form) {
            var a = Xl(r);
            if (!a) throw Error(w(90));
            ru(r), Ba(r, a);
          }
        }
      }
      break;
    case "textarea":
      au(e, n);
      break;
    case "select":
      t = n.value, t != null && On(e, !!n.multiple, t, false);
  }
};
fu = pi;
pu = vn;
var Kp = { usingClientEntryPoint: false, Events: [Dr, Nn, Xl, cu, du, pi] }, ar = { findFiberByHostInstance: sn, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, qp = { bundleType: ar.bundleType, version: ar.version, rendererPackageName: ar.rendererPackageName, rendererConfig: ar.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: Ot.ReactCurrentDispatcher, findHostInstanceByFiber: function(e) {
  return e = gu(e), e === null ? null : e.stateNode;
}, findFiberByHostInstance: ar.findFiberByHostInstance || Wp, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
  var ll = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!ll.isDisabled && ll.supportsFiber) try {
    Kl = ll.inject(qp), ut = ll;
  } catch {
  }
}
Me.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Kp;
Me.createPortal = function(e, t) {
  var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
  if (!bi(t)) throw Error(w(200));
  return Hp(e, t, null, n);
};
Me.createRoot = function(e, t) {
  if (!bi(e)) throw Error(w(299));
  var n = false, r = "", a = Gc;
  return t != null && (t.unstable_strictMode === true && (n = true), t.identifierPrefix !== void 0 && (r = t.identifierPrefix), t.onRecoverableError !== void 0 && (a = t.onRecoverableError)), t = vi(e, 1, false, null, null, n, false, r, a), e[jt] = t.current, Pr(e.nodeType === 8 ? e.parentNode : e), new xi(t);
};
Me.findDOMNode = function(e) {
  if (e == null) return null;
  if (e.nodeType === 1) return e;
  var t = e._reactInternals;
  if (t === void 0) throw typeof e.render == "function" ? Error(w(188)) : (e = Object.keys(e).join(","), Error(w(268, e)));
  return e = gu(t), e = e === null ? null : e.stateNode, e;
};
Me.flushSync = function(e) {
  return vn(e);
};
Me.hydrate = function(e, t, n) {
  if (!sa(t)) throw Error(w(200));
  return ia(null, e, t, true, n);
};
Me.hydrateRoot = function(e, t, n) {
  if (!bi(e)) throw Error(w(405));
  var r = n != null && n.hydratedSources || null, a = false, s = "", i = Gc;
  if (n != null && (n.unstable_strictMode === true && (a = true), n.identifierPrefix !== void 0 && (s = n.identifierPrefix), n.onRecoverableError !== void 0 && (i = n.onRecoverableError)), t = qc(t, null, e, 1, n ?? null, a, false, s, i), e[jt] = t.current, Pr(e), r) for (e = 0; e < r.length; e++) n = r[e], a = n._getVersion, a = a(n._source), t.mutableSourceEagerHydrationData == null ? t.mutableSourceEagerHydrationData = [n, a] : t.mutableSourceEagerHydrationData.push(n, a);
  return new aa(t);
};
Me.render = function(e, t, n) {
  if (!sa(t)) throw Error(w(200));
  return ia(null, e, t, false, n);
};
Me.unmountComponentAtNode = function(e) {
  if (!sa(e)) throw Error(w(40));
  return e._reactRootContainer ? (vn(function() {
    ia(null, null, e, false, function() {
      e._reactRootContainer = null, e[jt] = null;
    });
  }), true) : false;
};
Me.unstable_batchedUpdates = pi;
Me.unstable_renderSubtreeIntoContainer = function(e, t, n, r) {
  if (!sa(n)) throw Error(w(200));
  if (e == null || e._reactInternals === void 0) throw Error(w(38));
  return ia(e, t, n, false, r);
};
Me.version = "18.3.1-next-f1338f8080-20240426";
function Yc() {
  if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function")) try {
    __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(Yc);
  } catch (e) {
    console.error(e);
  }
}
Yc(), Go.exports = Me;
var Gp = Go.exports, Xc, Ro = Gp;
Xc = Ro.createRoot, Ro.hydrateRoot;
const Yp = import.meta.env.VITE_APP_SURFACE, Ql = import.meta.env.VITE_API_BASE_URL, Ft = Yp === "user" ? "user" : "admin", al = Ql || "http://127.0.0.1:3110", Mn = `${(import.meta.env.VITE_PUBLIC_PROXY_HOST || "127.0.0.1").trim()}:18001`, Pe = [{ value: "us", label: "US" }, { value: "gb", label: "GB" }, { value: "fr", label: "FR" }, { value: "ca", label: "CA" }, { value: "au", label: "AU" }];
function Xp() {
  const [e, t] = C.useState("dashboard"), [n, r] = C.useState("home"), a = `proxy-platform:${Ft}:auth`, [s, i] = C.useState(() => wh(a, Ft)), [o, u] = C.useState({ username: "", password: "" }), [f, v] = C.useState([]), [p, g] = C.useState([]), [m, x] = C.useState([]), [y, L] = C.useState([]), [c, d] = C.useState([]), [h, b] = C.useState(null), [S, N] = C.useState(true), [P, k] = C.useState(false), [V, I] = C.useState(null), [ce, $] = C.useState(null), [lt, Rt] = C.useState(null), [Xn, qe] = C.useState([]), [nn, E] = C.useState(null), [z, U] = C.useState(""), [K, G] = C.useState(null), [j, R] = C.useState({ username: "", password: "", trafficQuotaGb: "50", maxConcurrentConnections: "5", maxProxyEntries: "10", allowedCountries: Pe.map((O) => O.value) }), [je, we] = C.useState({ userId: "", targetCountry: "us", targetRegion: "", targetCity: "", count: "1" }), at = Ft === "user" ? f[0] ?? null : null, ad = C.useMemo(() => Fo(m.map((O) => O.status)), [m]), sd = C.useMemo(() => Fo(p.map((O) => O.status)), [p]), id = C.useMemo(() => jh(m), [m]), od = f.filter((O) => O.status === "active").length, ud = p.filter((O) => O.status === "active").length, cd = xt(y.filter((O) => Hl(O.date)).map((O) => O.totalBytes)), dd = xt(y.filter((O) => Wl(O.date)).map((O) => O.totalBytes));
  C.useEffect(() => {
    if (!s) {
      N(false);
      return;
    }
    ft();
  }, [s]);
  async function Ae(O, F) {
    const _ = await fetch(`${al}${O}`, { ...F, headers: { ...s ? { Authorization: `Bearer ${s.token}` } : {}, ...(F == null ? void 0 : F.headers) ?? {} } }), A = await _.json();
    if (!_.ok) throw new Error(A.error || `\u8BF7\u6C42\u5931\u8D25\uFF1A${O}`);
    return A;
  }
  async function ft() {
    if (s) {
      N(true), I(null);
      try {
        if (Ft === "user") {
          const Re = await Ae("/api/user/dashboard");
          v([Re.user]), g(Re.entries), L(Re.rows), x([]), d([]), b(null), Rt(/* @__PURE__ */ new Date());
          return;
        }
        const [O, F, _, A, se, ie] = await Promise.all([Ae("/api/admin/users"), Ae("/api/admin/proxy-entries"), Ae("/api/admin/upstreams"), Ae("/api/admin/traffic-daily"), Ae("/api/admin/operation-logs"), Ae("/api/admin/system-config")]);
        v(O.users), g(F.entries), x(_.upstreams), L(A.rows), d(se.logs), b(ie.config), Rt(/* @__PURE__ */ new Date());
      } catch (O) {
        I(O instanceof Error ? O.message : "\u8BFB\u53D6\u6570\u636E\u5931\u8D25");
      } finally {
        N(false);
      }
    }
  }
  async function fd() {
    await ft(), $("\u6570\u636E\u5DF2\u5237\u65B0\u3002");
  }
  function pd(O, F) {
    var _;
    t(O), G({ page: O, country: F.country ?? null, search: ((_ = F.search) == null ? void 0 : _.trim()) || "", token: Date.now() });
  }
  async function hd(O) {
    O.preventDefault(), k(true), I(null), $(null);
    try {
      const F = await Ae(`/api/${Ft}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: o.username.trim(), password: o.password }) }), _ = { token: F.token, user: F.user };
      localStorage.setItem(a, JSON.stringify(_)), u({ username: "", password: "" }), i(_), $("\u767B\u5F55\u6210\u529F\u3002");
    } catch (F) {
      I(F instanceof Error ? F.message : "\u767B\u5F55\u5931\u8D25");
    } finally {
      k(false);
    }
  }
  function md() {
    localStorage.removeItem(a), i(null), v([]), g([]), x([]), L([]), d([]), b(null), qe([]), Rt(null);
  }
  async function gd(O) {
    O.preventDefault(), k(true), I(null), $(null);
    try {
      const F = await Ae("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: j.username.trim(), password: j.password.trim() || void 0, trafficQuotaGb: Number(j.trafficQuotaGb || 0), maxProxyEntries: Number(j.maxProxyEntries || 10), maxConcurrentConnections: Number(j.maxConcurrentConnections || 1), allowedCountries: j.allowedCountries }) });
      if (!F.ok) throw new Error(F.error || "\u521B\u5EFA\u7528\u6237\u5931\u8D25");
      return R({ username: "", password: "", trafficQuotaGb: "50", maxConcurrentConnections: "5", maxProxyEntries: "10", allowedCountries: Pe.map((_) => _.value) }), $("\u7528\u6237\u5DF2\u521B\u5EFA\u3002\u521D\u59CB\u5BC6\u7801\u53EA\u4F1A\u663E\u793A\u8FD9\u4E00\u56DE\uFF0C\u8BF7\u73B0\u5728\u4FDD\u5B58\u3002"), await ft(), F.user && F.initialPassword ? { user: F.user, initialPassword: F.initialPassword } : null;
    } catch (F) {
      return I(F instanceof Error ? F.message : "\u521B\u5EFA\u7528\u6237\u5931\u8D25"), null;
    } finally {
      k(false);
    }
  }
  async function vd(O, F) {
    k(true), I(null), $(null);
    try {
      const _ = await Ae(`/api/admin/users/${O}/password-reset`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: F.trim() || void 0 }) });
      if (!_.ok || !_.newPassword) throw new Error(_.error || "\u91CD\u7F6E\u5BC6\u7801\u5931\u8D25");
      return _.user && v((A) => A.map((se) => {
        var ie;
        return se.id === ((ie = _.user) == null ? void 0 : ie.id) ? _.user : se;
      })), $("\u5BC6\u7801\u5DF2\u91CD\u7F6E\u3002\u65B0\u5BC6\u7801\u53EA\u663E\u793A\u8FD9\u4E00\u6B21\uFF0C\u8BF7\u73B0\u5728\u4FDD\u5B58\u3002"), await ft(), _;
    } catch (_) {
      const A = _ instanceof Error ? _.message : "\u91CD\u7F6E\u5BC6\u7801\u5931\u8D25";
      return I(A), { ok: false, error: A };
    } finally {
      k(false);
    }
  }
  async function yd(O, F) {
    k(true), I(null), $(null);
    try {
      const _ = await Ae(`/api/admin/users/${O}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: F.status, trafficQuotaGb: Number(F.trafficQuotaGb || 0), maxProxyEntries: Number(F.maxProxyEntries || 1), maxConcurrentConnections: Number(F.maxConcurrentConnections || 1), allowedCountries: F.allowedCountries }) });
      if (!_.ok || !_.user) throw new Error(_.error || "\u4FDD\u5B58\u7528\u6237\u8BBE\u7F6E\u5931\u8D25");
      return v((A) => A.map((se) => {
        var ie;
        return se.id === ((ie = _.user) == null ? void 0 : ie.id) ? _.user : se;
      })), $("\u7528\u6237\u8BBE\u7F6E\u5DF2\u4FDD\u5B58\uFF0C\u5E76\u5DF2\u5199\u5165\u64CD\u4F5C\u65E5\u5FD7\u3002"), await ft(), _;
    } catch (_) {
      const A = _ instanceof Error ? _.message : "\u4FDD\u5B58\u7528\u6237\u8BBE\u7F6E\u5931\u8D25";
      return I(A), { ok: false, error: A };
    } finally {
      k(false);
    }
  }
  async function xd(O, F) {
    k(true), I(null), $(null);
    try {
      const _ = await Ae(`/api/admin/proxy-entries/${O}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: F }) });
      if (!_.ok || !_.entry) throw new Error(_.error || "\u4FEE\u6539\u4EE3\u7406\u72B6\u6001\u5931\u8D25");
      return g((A) => A.map((se) => {
        var ie;
        return se.id === ((ie = _.entry) == null ? void 0 : ie.id) ? { ...se, status: _.entry.status, currentUpstreamId: _.entry.currentUpstreamId, currentIp: _.entry.currentIp, currentCountry: _.entry.currentCountry, currentRegion: _.entry.currentRegion, currentCity: _.entry.currentCity, updatedAt: _.entry.updatedAt } : se;
      })), $(F === "disabled" ? "\u4EE3\u7406\u5DF2\u505C\u7528\u3002\u5F53\u524D\u7ED1\u5B9A\u5DF2\u6309\u89C4\u5219\u5904\u7406\uFF0C\u5E76\u5DF2\u5199\u5165\u64CD\u4F5C\u65E5\u5FD7\u3002" : "\u4EE3\u7406\u5DF2\u542F\u7528\u3002\u7CFB\u7EDF\u5DF2\u5C1D\u8BD5\u91CD\u65B0\u5339\u914D\u53EF\u7528\u4E0A\u6E38\uFF0C\u5E76\u5DF2\u5199\u5165\u64CD\u4F5C\u65E5\u5FD7\u3002"), await ft(), _;
    } catch (_) {
      const A = _ instanceof Error ? _.message : "\u4FEE\u6539\u4EE3\u7406\u72B6\u6001\u5931\u8D25";
      return I(A), { ok: false, error: A };
    } finally {
      k(false);
    }
  }
  async function delUserH(O) {
    k(true), I(null), $(null);
    try {
      const _ = await Ae(`/api/admin/users/${O}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true }) });
      if (!_.ok) throw new Error(_.error || "\u5220\u9664\u7528\u6237\u5931\u8D25");
      return v((A) => A.filter((se) => se.id !== O)), $("\u7528\u6237\u5DF2\u5220\u9664\uFF0C\u5176\u4EE3\u7406\u4E0E\u6D41\u91CF\u8BB0\u5F55\u5DF2\u6E05\u7406\uFF0C\u4E0A\u6E38\u5DF2\u91CA\u653E\uFF0C\u5E76\u5DF2\u5199\u5165\u64CD\u4F5C\u65E5\u5FD7\u3002"), await ft(), _;
    } catch (_) {
      const A = _ instanceof Error ? _.message : "\u5220\u9664\u7528\u6237\u5931\u8D25";
      return I(A), { ok: false, error: A };
    } finally {
      k(false);
    }
  }
  async function delEntryH(O) {
    k(true), I(null), $(null);
    try {
      const _ = await Ae(`/api/admin/proxy-entries/${O}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true }) });
      if (!_.ok) throw new Error(_.error || "\u5220\u9664\u4EE3\u7406\u5931\u8D25");
      return g((A) => A.filter((se) => se.id !== O)), $("\u4EE3\u7406\u5DF2\u5220\u9664\uFF0C\u7ED1\u5B9A\u7684\u4E0A\u6E38\u5DF2\u91CA\u653E\u56DE\u53EF\u7528\u6C60\uFF0C\u5E76\u5DF2\u5199\u5165\u64CD\u4F5C\u65E5\u5FD7\u3002"), await ft(), _;
    } catch (_) {
      const A = _ instanceof Error ? _.message : "\u5220\u9664\u4EE3\u7406\u5931\u8D25";
      return I(A), { ok: false, error: A };
    } finally {
      k(false);
    }
  }
  async function delUpstreamH(O) {
    k(true), I(null), $(null);
    try {
      const _ = await Ae(`/api/admin/upstreams/${O}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true }) });
      if (!_.ok) throw new Error(_.error || "\u5220\u9664\u4E0A\u6E38\u5931\u8D25");
      return x((A) => A.filter((se) => se.id !== O)), $("\u4E0A\u6E38\u5DF2\u5220\u9664\uFF0C\u626B\u63CF\u65E5\u5FD7\u5DF2\u6E05\u7406\uFF0C\u5E76\u5DF2\u5199\u5165\u64CD\u4F5C\u65E5\u5FD7\u3002"), await ft(), _;
    } catch (_) {
      const A = _ instanceof Error ? _.message : "\u5220\u9664\u4E0A\u6E38\u5931\u8D25";
      return I(A), { ok: false, error: A };
    } finally {
      k(false);
    }
  }
  async function setUpstreamStatusH(O, F) {
    k(true), I(null), $(null);
    try {
      const _ = await Ae(`/api/admin/upstreams/${O}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: F }) });
      if (!_.ok || !_.upstream) throw new Error(_.error || "\u4FEE\u6539\u4E0A\u6E38\u72B6\u6001\u5931\u8D25");
      return x((A) => A.map((se) => se.id === O ? { ...se, status: _.upstream.status } : se)), $(F === "disabled" ? "\u4E0A\u6E38\u5DF2\u505C\u7528\uFF0C\u4E0D\u4F1A\u518D\u88AB\u626B\u63CF\u6216\u5206\u914D\uFF0C\u5E76\u5DF2\u5199\u5165\u64CD\u4F5C\u65E5\u5FD7\u3002" : "\u4E0A\u6E38\u5DF2\u542F\u7528\uFF08\u6062\u590D\u4E3A\u7A7A\u95F2\uFF09\uFF0C\u5E76\u5DF2\u5199\u5165\u64CD\u4F5C\u65E5\u5FD7\u3002"), await ft(), _;
    } catch (_) {
      const A = _ instanceof Error ? _.message : "\u4FEE\u6539\u4E0A\u6E38\u72B6\u6001\u5931\u8D25";
      return I(A), { ok: false, error: A };
    } finally {
      k(false);
    }
  }
  async function bd(O) {
    O.preventDefault(), k(true), I(null), $(null), E(null);
    try {
      const F = await fetch(`${al}/api/admin/upstreams/import`, { method: "POST", headers: { Authorization: `Bearer ${(s == null ? void 0 : s.token) ?? ""}`, "Content-Type": "application/json" }, body: JSON.stringify({ text: z }) }), _ = await F.json();
      if (!F.ok && F.status !== 207) throw new Error("error" in _ && _.error ? _.error : "\u5BFC\u5165\u4E0A\u6E38\u5931\u8D25");
      const A = _;
      E(A), $(`\u5BFC\u5165\u5B8C\u6210\uFF1A\u65B0\u589E ${A.created} \u6761\uFF0C\u91CD\u590D ${A.duplicates} \u6761\uFF0C\u5931\u8D25 ${A.failed} \u6761\u3002`), A.created > 0 && A.failed === 0 && U(""), await ft();
    } catch (F) {
      I(F instanceof Error ? F.message : "\u5BFC\u5165\u4E0A\u6E38\u5931\u8D25");
    } finally {
      k(false);
    }
  }
  async function jd(O) {
    O.preventDefault(), k(true), I(null), $(null);
    const F = Math.max(1, Math.min(20, Number(je.count || 1))), _ = [];
    let A = 0;
    try {
      for (let se = 0; se < F; se += 1) {
        const ie = await fetch(`${al}/api/user/proxy-entries`, { method: "POST", headers: { Authorization: `Bearer ${(s == null ? void 0 : s.token) ?? ""}`, "Content-Type": "application/json" }, body: JSON.stringify({ targetCountry: je.targetCountry, targetRegion: je.targetRegion.trim() || void 0, targetCity: je.targetCity.trim() || void 0 }) }), Re = await ie.json();
        if (!ie.ok || !("ok" in Re) || !Re.ok) {
          if (A += 1, _.length === 0) throw new Error("error" in Re && Re.error ? Re.error : "\u751F\u6210\u4EE3\u7406\u5931\u8D25");
          break;
        }
        _.push((() => { const L = Re.clientProxy.copyText.split(":"); return L.length >= 4 ? (L[0] = (import.meta.env.VITE_PUBLIC_PROXY_HOST || "127.0.0.1").trim(), L.join(":")) : Re.clientProxy.copyText.replace(/^VPS_IP:/, "127.0.0.1:"); })());
      }
      qe((St) => [...St, ..._]), $(`\u5DF2\u751F\u6210 ${_.length} \u6761\u4EE3\u7406${A > 0 ? `\uFF0C${A} \u6761\u56E0\u5E93\u5B58\u4E0D\u8DB3\u672A\u751F\u6210` : ""}\u3002`), await ft();
    } catch (se) {
      I(se instanceof Error ? se.message : "\u751F\u6210\u4EE3\u7406\u5931\u8D25");
    } finally {
      k(false);
    }
  }
  async function wd(O) {
    k(true), I(null), $(null), qe([]);
    const F = Math.max(1, Math.min(20, Number(O.count || 1))), _ = [];
    let A = 0;
    const se = Number(O.userId || 0);
    try {
      for (let ie = 0; ie < F; ie += 1) {
        const Re = await fetch(`${al}/api/admin/proxy-entries`, { method: "POST", headers: { Authorization: `Bearer ${(s == null ? void 0 : s.token) ?? ""}`, "Content-Type": "application/json" }, body: JSON.stringify({ userId: se, targetCountry: O.targetCountry, targetRegion: O.targetRegion.trim() || void 0, targetCity: O.targetCity.trim() || void 0 }) }), rn = await Re.json();
        if (!Re.ok || "ok" in rn && rn.ok === false) {
          if (A += 1, _.length === 0) throw new Error("error" in rn && rn.error ? rn.error : "\u521B\u5EFA\u4EE3\u7406\u5931\u8D25");
          break;
        }
        if (!("clientProxy" in rn)) {
          if (A += 1, _.length === 0) throw new Error("\u521B\u5EFA\u4EE3\u7406\u5931\u8D25");
          break;
        }
        _.push(rn.clientProxy.copyText);
      }
      return qe(_), $(`\u5DF2\u751F\u6210 ${_.length} \u6761\u4EE3\u7406${A > 0 ? `\uFF0C\u53E6\u6709 ${A} \u6761\u56E0\u5E93\u5B58\u4E0D\u8DB3\u672A\u751F\u6210` : ""}\u3002\u5BC6\u7801\u53EA\u663E\u793A\u8FD9\u4E00\u56DE\u3002`), await ft(), { copies: _, failed: A };
    } catch (ie) {
      return I(ie instanceof Error ? ie.message : "\u521B\u5EFA\u4EE3\u7406\u5931\u8D25"), null;
    } finally {
      k(false);
    }
  }
  async function Si(O, F) {
    I(null);
    try {
      await navigator.clipboard.writeText(O), $(F);
    } catch {
      $(null), I("\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u590D\u5236\u8FD9\u6BB5\u5185\u5BB9\u3002");
    }
  }
  return l.jsxs("main", { className: "app-shell", children: [l.jsx(Jp, { surface: Ft, onLogout: s ? md : void 0, onRefresh: () => void fd(), isLoading: S || !s, lastLoadedAt: lt, username: s == null ? void 0 : s.user.username }), l.jsx(bh, { error: V, notice: ce }), s ? Ft === "admin" ? l.jsx(eh, { activeEntries: ud, activePage: e, activeUsers: od, copyText: Si, createAdminEntries: wd, createUser: gd, entries: p, entryStats: sd, importResult: nn, importUpstreams: bd, isLoading: S, isSaving: P, monthTraffic: dd, operationLogs: c, onOpenAdminReadOnlyPage: pd, readOnlyIntent: K, resetUserPassword: vd, regions: id, setActivePage: t, setReadOnlyIntent: G, setUpstreamText: U, setUserForm: R, todayTraffic: cd, trafficRows: y, upstreamStats: ad, upstreamText: z, upstreams: m, systemConfig: h, updateProxyEntryStatus: xd, updateUserSettings: yd, deleteUser: delUserH, deleteProxyEntry: delEntryH, deleteUpstream: delUpstreamH, updateUpstreamStatus: setUpstreamStatusH, userForm: j, users: f }) : l.jsx(fh, { activePage: n, copyText: Si, createEntries: jd, createdCopies: Xn, entries: p, form: je, isSaving: P, selectedUser: at, setActivePage: r, setForm: we, trafficRows: y }) : l.jsx(Zp, { form: o, isSaving: P, onSubmit: hd, setForm: u, surface: Ft })] });
}
function Jp(e) {
  return l.jsxs("header", { className: "topbar", children: [l.jsxs("div", { children: [l.jsx("p", { className: "eyebrow", children: "Proxy Platform" }), l.jsx("h1", { children: e.surface === "admin" ? "\u8FD0\u8425\u63A7\u5236\u53F0" : "\u63A7\u5236\u53F0" }), l.jsx("p", { className: "subtitle", children: e.surface === "admin" ? "\u7BA1\u7406\u4E0A\u6E38\u8D44\u6E90\u3001\u7528\u6237\u4E0E\u4EE3\u7406\u8FD0\u884C\u72B6\u6001\u3002" : "\u751F\u6210\u4EE3\u7406\u3001\u67E5\u770B\u6D41\u91CF\u4E0E\u989D\u5EA6\u3002" })] }), l.jsxs("div", { className: "topbar-actions", children: [e.username && l.jsx("span", { className: "user-chip", children: e.username }), e.username && l.jsx("span", { className: "refresh-status", children: e.isLoading ? "\u5237\u65B0\u4E2D..." : e.lastLoadedAt ? `\u6700\u540E\u5237\u65B0 ${Nh(e.lastLoadedAt)}` : "\u7B49\u5F85\u5237\u65B0" }), l.jsx("button", { className: "refresh-button", type: "button", onClick: e.onRefresh, disabled: e.isLoading, title: "\u5237\u65B0", "aria-label": "\u5237\u65B0", children: "\u21BB" }), e.onLogout && l.jsx("button", { className: "logout-button", type: "button", onClick: e.onLogout, children: "\u9000\u51FA\u767B\u5F55" })] })] });
}
function Zp(e) {
  return l.jsx("section", { className: "login-shell", children: l.jsxs("form", { className: "login-panel", onSubmit: e.onSubmit, children: [l.jsxs("div", { className: "section-heading", children: [l.jsx("h2", { children: e.surface === "admin" ? "\u767B\u5F55\u8FD0\u8425\u63A7\u5236\u53F0" : "\u767B\u5F55\u63A7\u5236\u53F0" }), l.jsx("span", { children: e.surface === "admin" ? "\u7BA1\u7406\u5458\u4E13\u7528\u5165\u53E3" : "\u4F7F\u7528\u7BA1\u7406\u5458\u5206\u914D\u7684\u8D26\u53F7" })] }), l.jsxs("div", { className: "hint-list", children: [l.jsx("span", { children: e.surface === "admin" ? "\u8BF7\u4F7F\u7528\u7BA1\u7406\u5458\u8D26\u53F7\u767B\u5F55\u540E\u53F0\uFF1B\u666E\u901A\u7528\u6237\u8D26\u53F7\u4E0D\u80FD\u8FDB\u5165\u7BA1\u7406\u5458\u9875\u9762\u3002" : "\u8BF7\u4F7F\u7528\u7BA1\u7406\u5458\u53D1\u7ED9\u4F60\u7684\u666E\u901A\u7528\u6237\u8D26\u53F7\u767B\u5F55\uFF0C\u53EA\u80FD\u67E5\u770B\u4F60\u81EA\u5DF1\u7684\u4EE3\u7406\u548C\u6D41\u91CF\u3002" }), l.jsx("span", { children: e.surface === "admin" ? "\u5982\u679C\u7BA1\u7406\u5458\u5BC6\u7801\u5FD8\u8BB0\u4E86\uFF0C\u8BF7\u5148\u56DE\u5230\u9879\u76EE\u4FDD\u5B58\u7684\u5B89\u5168\u8BB0\u5F55\u5904\u7406\uFF1B\u4E0D\u8981\u5728\u8FD9\u91CC\u731C\u5BC6\u7801\u3002" : "\u5982\u679C\u5FD8\u8BB0\u5BC6\u7801\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458\u91CD\u7F6E\uFF1B\u7CFB\u7EDF\u4E0D\u4F1A\u663E\u793A\u65E7\u5BC6\u7801\u3002" })] }), l.jsxs("label", { children: ["\u7528\u6237\u540D", l.jsx("span", { className: "field-note", children: "\u8F93\u5165\u767B\u5F55\u8D26\u53F7\u7684\u7528\u6237\u540D\uFF0C\u4E0D\u662F\u5907\u6CE8\u540D\u3002" }), l.jsx("input", { autoComplete: "username", value: e.form.username, onChange: (t) => e.setForm({ ...e.form, username: t.target.value }) })] }), l.jsxs("label", { children: ["\u5BC6\u7801", l.jsx("span", { className: "field-note", children: "\u8F93\u5165\u5F53\u524D\u5BC6\u7801\uFF1B\u5BC6\u7801\u8F93\u9519\u65F6\u8BF7\u91CD\u65B0\u68C0\u67E5\u5927\u5C0F\u5199\u548C\u7A7A\u683C\u3002" }), l.jsx("input", { autoComplete: "current-password", type: "password", value: e.form.password, onChange: (t) => e.setForm({ ...e.form, password: t.target.value }) })] }), l.jsx("button", { className: "primary-button", disabled: e.isSaving, type: "submit", children: "\u767B\u5F55" })] }) });
}
function eh(e) {
  var t, n, r, a;
  return l.jsxs("section", { className: "workspace", children: [l.jsxs(Jc, { label: "\u7BA1\u7406\u5458\u540E\u53F0\u5BFC\u822A", children: [l.jsx(Je, { active: e.activePage === "dashboard", onClick: () => e.setActivePage("dashboard"), children: "\u603B\u89C8" }), l.jsx(Je, { active: e.activePage === "users", onClick: () => e.setActivePage("users"), children: "\u7528\u6237\u7BA1\u7406" }), l.jsx(Je, { active: e.activePage === "upstreams", onClick: () => e.setActivePage("upstreams"), children: "\u4E0A\u6E38\u8D44\u6E90" }), l.jsx(Je, { active: e.activePage === "geo", onClick: () => e.setActivePage("geo"), children: "\u5730\u533A\u5E93\u5B58" }), l.jsx(Je, { active: e.activePage === "proxies", onClick: () => e.setActivePage("proxies"), children: "\u4EE3\u7406\u8FD0\u884C" }), l.jsx(Je, { active: e.activePage === "logs", onClick: () => e.setActivePage("logs"), children: "\u65E5\u5FD7" }), l.jsx(Je, { active: e.activePage === "settings", onClick: () => e.setActivePage("settings"), children: "\u8BBE\u7F6E" })] }), l.jsxs("section", { className: "content", children: [e.activePage === "dashboard" && l.jsx(th, { activeEntries: e.activeEntries, activeUsers: e.activeUsers, entryStats: e.entryStats, monthTraffic: e.monthTraffic, regions: e.regions, todayTraffic: e.todayTraffic, trafficRows: e.trafficRows, upstreamStats: e.upstreamStats, upstreams: e.upstreams, users: e.users, onNavigate: e.setActivePage }), e.activePage === "users" && l.jsx(nh, { copyText: e.copyText, createAdminEntries: e.createAdminEntries, createUser: e.createUser, isLoading: e.isLoading, isSaving: e.isSaving, onOpenAdminReadOnlyPage: e.onOpenAdminReadOnlyPage, readOnlyIntent: ((t = e.readOnlyIntent) == null ? void 0 : t.page) === "users" ? e.readOnlyIntent : null, resetUserPassword: e.resetUserPassword, setReadOnlyIntent: e.setReadOnlyIntent, setUserForm: e.setUserForm, updateUserSettings: e.updateUserSettings, deleteUser: e.deleteUser, userForm: e.userForm, users: e.users }), e.activePage === "upstreams" && l.jsx(lh, { importResult: e.importResult, importUpstreams: e.importUpstreams, isSaving: e.isSaving, onOpenAdminReadOnlyPage: e.onOpenAdminReadOnlyPage, readOnlyIntent: ((n = e.readOnlyIntent) == null ? void 0 : n.page) === "upstreams" ? e.readOnlyIntent : null, setReadOnlyIntent: e.setReadOnlyIntent, setUpstreamText: e.setUpstreamText, upstreamStats: e.upstreamStats, upstreamText: e.upstreamText, deleteUpstream: e.deleteUpstream, updateUpstreamStatus: e.updateUpstreamStatus, upstreams: e.upstreams }), e.activePage === "geo" && l.jsx(sh, { onOpenAdminReadOnlyPage: e.onOpenAdminReadOnlyPage, regions: e.regions }), e.activePage === "proxies" && l.jsx(ih, { entries: e.entries, isSaving: e.isSaving, onOpenAdminReadOnlyPage: e.onOpenAdminReadOnlyPage, readOnlyIntent: ((r = e.readOnlyIntent) == null ? void 0 : r.page) === "proxies" ? e.readOnlyIntent : null, setReadOnlyIntent: e.setReadOnlyIntent, updateProxyEntryStatus: e.updateProxyEntryStatus, deleteProxyEntry: e.deleteProxyEntry }), e.activePage === "logs" && l.jsx(ch, { operationLogs: e.operationLogs, readOnlyIntent: ((a = e.readOnlyIntent) == null ? void 0 : a.page) === "logs" ? e.readOnlyIntent : null, setReadOnlyIntent: e.setReadOnlyIntent, upstreams: e.upstreams }), e.activePage === "settings" && l.jsx(dh, { copyText: e.copyText, systemConfig: e.systemConfig })] })] });
}
function th(e) {
  const t = (e.upstreamStats.bad ?? 0) + (e.upstreamStats.disabled ?? 0) + (e.upstreamStats.cooldown ?? 0), n = e.users.filter((a) => ki(Number(a.trafficUsedBytes), Number(a.trafficQuotaBytes)) >= 85), r = e.regions.filter((a) => a.total > 0 && a.free < 2).slice(0, 6);
  return l.jsxs(l.Fragment, { children: [l.jsxs("section", { className: "metric-grid", children: [l.jsx(M, { label: "\u542F\u7528\u7528\u6237", value: `${e.activeUsers}/${e.users.length}` }), l.jsx(M, { label: "\u542F\u7528\u4EE3\u7406", value: `${e.activeEntries}/${kh(e.entryStats)}` }), l.jsx(M, { label: "\u4ECA\u65E5\u6D41\u91CF", value: re(String(e.todayTraffic)) }), l.jsx(M, { label: "\u672C\u6708\u6D41\u91CF", value: re(String(e.monthTraffic)) }), l.jsx(M, { label: "\u4E0A\u6E38\u8D44\u6E90", value: String(e.upstreams.length) }), l.jsx(M, { label: "\u5F02\u5E38\u4E0A\u6E38", value: String(t), tone: t > 0 ? "warn" : "ok" })] }), l.jsxs("section", { className: "split-grid", children: [l.jsx(H, { title: "\u6570\u636E\u4EEA\u8868", children: l.jsx(Zc, { items: [{ label: "\u7A7A\u95F2", value: e.upstreamStats.free ?? 0, tone: "ok" }, { label: "\u5DF2\u7ED1\u5B9A", value: e.upstreamStats.locked ?? 0, tone: "info" }, { label: "\u51B7\u5374", value: e.upstreamStats.cooldown ?? 0, tone: "warn" }, { label: "\u5931\u8D25/\u7981\u7528", value: t, tone: "bad" }] }) }), l.jsx(H, { title: "\u8FD1 7 \u65E5\u6D41\u91CF", children: l.jsx(yh, { rows: e.trafficRows }) })] }), l.jsxs("section", { className: "split-grid", children: [l.jsx(H, { title: "\u5F85\u5904\u7406\u4E8B\u9879", children: l.jsxs("div", { className: "task-list", children: [l.jsxs("button", { type: "button", onClick: () => e.onNavigate("upstreams"), children: [l.jsx("span", { children: "\u5F02\u5E38\u4E0A\u6E38" }), l.jsx("strong", { children: t })] }), l.jsxs("button", { type: "button", onClick: () => e.onNavigate("geo"), children: [l.jsx("span", { children: "\u4F4E\u5E93\u5B58\u5730\u533A" }), l.jsx("strong", { children: r.length })] }), l.jsxs("button", { type: "button", onClick: () => e.onNavigate("users"), children: [l.jsx("span", { children: "\u989D\u5EA6\u98CE\u9669\u7528\u6237" }), l.jsx("strong", { children: n.length })] }), l.jsxs("button", { type: "button", onClick: () => e.onNavigate("logs"), children: [l.jsx("span", { children: "\u64CD\u4F5C\u65E5\u5FD7" }), l.jsx("strong", { children: "\u67E5\u770B" })] })] }) }), l.jsxs(H, { title: "\u7CFB\u7EDF\u5065\u5EB7", children: [l.jsx(sl, { label: "\u7A7A\u95F2\u4E0A\u6E38", value: String(e.upstreamStats.free ?? 0) }), l.jsx(sl, { label: "\u5DF2\u7ED1\u5B9A\u4E0A\u6E38", value: String(e.upstreamStats.locked ?? 0) }), l.jsx(sl, { label: "\u51B7\u5374/\u5931\u8D25", value: String((e.upstreamStats.cooldown ?? 0) + (e.upstreamStats.bad ?? 0)) }), l.jsx(sl, { label: "\u7981\u7528\u4EE3\u7406", value: String(e.entryStats.disabled ?? 0) })] })] }), l.jsx("section", { className: "split-grid", children: l.jsx(H, { title: "\u9700\u8981\u5173\u6CE8", children: n.length === 0 && r.length === 0 ? l.jsx(Pt, { text: "\u5F53\u524D\u6CA1\u6709\u660E\u663E\u98CE\u9669\u3002" }) : l.jsxs("div", { className: "alert-list", children: [n.map((a) => l.jsxs("span", { children: ["\u989D\u5EA6\u63A5\u8FD1\u7528\u5B8C\uFF1A", a.username] }, a.id)), r.map((a) => l.jsxs("span", { children: ["\u5E93\u5B58\u504F\u4F4E\uFF1A", a.label] }, a.key))] }) }) })] });
}
function nh(e) {
  var t;
  const [n, r] = C.useState(false), [a, s] = C.useState(null), [i, o] = C.useState(null), [u, f] = C.useState({ userId: "", targetCountry: "us", targetRegion: "", targetCity: "", count: "1" }), [v, p] = C.useState(null), [g, m] = C.useState({ status: "active", trafficQuotaGb: "0", maxConcurrentConnections: "1", maxProxyEntries: "10", allowedCountries: Pe.map((j) => j.value) }), [x, y] = C.useState(null), [L, c] = C.useState(""), [d, h] = C.useState(null), [b, S] = C.useState(((t = e.users[0]) == null ? void 0 : t.id) ?? null), [N, P] = C.useState(""), [k, V] = C.useState("all"), I = e.users.filter((j) => {
    const R = N.trim().toLowerCase(), je = !R || j.username.toLowerCase().includes(R) || j.role.toLowerCase().includes(R) || String(j.id).includes(R), we = k === "all" || j.status === k;
    return je && we;
  }), ce = Tt(I, 8), $ = I.find((j) => j.id === b) ?? I[0] ?? null, lt = e.users.filter((j) => ki(Number(j.trafficUsedBytes), Number(j.trafficQuotaBytes)) >= 85), Rt = !!N.trim() || k !== "all";
  C.useEffect(() => {
    e.readOnlyIntent && (e.readOnlyIntent.search && P(e.readOnlyIntent.search), V("all"), e.setReadOnlyIntent(null));
  }, [e.readOnlyIntent, e.setReadOnlyIntent]), C.useEffect(() => {
    if (!$) return;
    const j = $.allowedCountries && $.allowedCountries.length > 0 ? $.allowedCountries : Pe.map((R) => R.value);
    o(null), f((R) => ({ ...R, userId: String($.id), targetCountry: j.includes(R.targetCountry) ? R.targetCountry : j[0] ?? "us" }));
  }, [$]);
  async function Xn(j) {
    if (j.preventDefault(), !x) return;
    const R = await e.resetUserPassword(x.id, L);
    R.ok && (c(""), h(R));
  }
  async function qe(j) {
    const R = await e.createUser(j);
    R && (s(R), S(R.user.id));
  }
  async function nn(j) {
    if (j.preventDefault(), !$) return;
    const R = await e.createAdminEntries({ ...u, userId: String($.id) });
    R && o(R);
  }
  async function E(j) {
    j.preventDefault(), v && (await e.updateUserSettings(v.id, g)).ok && (S(v.id), p(null));
  }
  function z(j) {
    p(j), m({ status: j.status, trafficQuotaGb: Ch(j.trafficQuotaBytes), maxConcurrentConnections: String(j.maxConcurrentConnections), maxProxyEntries: String(j.maxProxyEntries), allowedCountries: j.allowedCountries && j.allowedCountries.length > 0 ? j.allowedCountries : Pe.map((R) => R.value) });
  }
  function U(j) {
    y(j), c(""), h(null);
  }
  function K() {
    r(false), s(null);
  }
  function G() {
    y(null), c(""), h(null);
  }
  return l.jsxs(l.Fragment, { children: [l.jsxs("section", { className: "metric-grid compact", children: [l.jsx(M, { label: "\u603B\u7528\u6237", value: String(e.users.length) }), l.jsx(M, { label: "\u542F\u7528\u7528\u6237", value: String(e.users.filter((j) => j.status === "active").length) }), l.jsx(M, { label: "\u505C\u7528\u7528\u6237", value: String(e.users.filter((j) => j.status === "disabled").length) }), l.jsx(M, { label: "\u989D\u5EA6\u98CE\u9669", value: String(lt.length), tone: lt.length > 0 ? "warn" : void 0 }), l.jsx(M, { label: "\u4EE3\u7406\u603B\u6570", value: String(e.users.reduce((j, R) => j + R.proxyEntryCount, 0)) })] }), l.jsxs("section", { className: "action-strip", children: [l.jsxs("div", { children: [l.jsx("h2", { children: "\u7528\u6237\u7BA1\u7406\u5DE5\u4F5C\u533A" }), l.jsx("p", { children: "\u5148\u770B\u7528\u6237\u5065\u5EB7\u548C\u989D\u5EA6\u98CE\u9669\uFF0C\u518D\u67E5\u770B\u5355\u4E2A\u7528\u6237\u8BE6\u60C5\u3002\u65B0\u5EFA\u7528\u6237\u6536\u8FDB\u5F39\u7A97\uFF0C\u907F\u514D\u7BA1\u7406\u9875\u53D8\u6210\u8868\u5355\u9875\u3002" })] }), l.jsx("button", { className: "primary-button", type: "button", onClick: () => r(true), children: "\u65B0\u5EFA\u7528\u6237" })] }), l.jsxs("section", { className: "master-detail", children: [l.jsxs(H, { title: "\u7528\u6237\u7BA1\u7406", count: I.length, loading: e.isLoading, children: [l.jsx("div", { className: "hint-list", children: l.jsx("span", { children: "\u641C\u7D22\u53EF\u4EE5\u8F93\u5165\u7528\u6237 ID\u3001\u7528\u6237\u540D\u6216\u89D2\u8272\uFF1B\u72B6\u6001\u7B5B\u9009\u53EA\u4F1A\u4FDD\u7559\u5BF9\u5E94\u72B6\u6001\u7684\u7528\u6237\u3002" }) }), l.jsxs("div", { className: "table-tools", children: [l.jsxs("label", { children: ["\u641C\u7D22", l.jsx("input", { value: N, onChange: (j) => P(j.target.value), placeholder: "ID\u3001\u7528\u6237\u540D\u3001\u89D2\u8272" })] }), l.jsxs("label", { children: ["\u72B6\u6001", l.jsxs("select", { value: k, onChange: (j) => V(j.target.value), children: [l.jsx("option", { value: "all", children: "\u5168\u90E8\u72B6\u6001" }), l.jsx("option", { value: "active", children: "\u542F\u7528" }), l.jsx("option", { value: "disabled", children: "\u505C\u7528" })] })] }), Rt && l.jsx("button", { type: "button", onClick: () => {
    P(""), V("all");
  }, children: "\u91CD\u7F6E\u7B5B\u9009" })] }), l.jsx(Et, { items: [{ label: "\u641C\u7D22", value: N.trim() || null, onClear: N.trim() ? () => P("") : null }, { label: "\u72B6\u6001", value: k === "all" ? null : Lt(k), onClear: k === "all" ? null : () => V("all") }] }), l.jsx(Nt, { shown: I.length, total: e.users.length }), l.jsxs(St, { minWidth: 760, maxHeight: 500, children: [l.jsx("thead", { children: l.jsxs("tr", { children: [l.jsx("th", { children: "\u7528\u6237" }), l.jsx("th", { children: "\u72B6\u6001" }), l.jsx("th", { children: "\u5DF2\u7528\u6D41\u91CF" }), l.jsx("th", { children: "\u5269\u4F59\u989D\u5EA6" }), l.jsx("th", { children: "\u4EE3\u7406\u6570" }), l.jsx("th", { children: "\u64CD\u4F5C" })] }) }), l.jsx("tbody", { children: ce.rows.map((j) => l.jsxs("tr", { className: ($ == null ? void 0 : $.id) === j.id ? "selected-row" : void 0, children: [l.jsx("td", { children: l.jsx("strong", { children: j.username }) }), l.jsx("td", { children: l.jsx(dt, { status: j.status }) }), l.jsx("td", { children: re(j.trafficUsedBytes) }), l.jsx("td", { children: ed(j.trafficQuotaBytes, j.trafficUsedBytes) }), l.jsxs("td", { children: [j.proxyEntryCount, "/", j.maxProxyEntries] }), l.jsx("td", { children: l.jsxs(Yn, { children: [l.jsx("button", { type: "button", onClick: () => S(j.id), children: "\u67E5\u770B" }), l.jsx("button", { type: "button", disabled: j.role !== "user", onClick: () => z(j), children: "\u7F16\u8F91\u8BBE\u7F6E" }), l.jsx("button", { type: "button", disabled: j.role !== "user", onClick: () => U(j), children: "\u91CD\u7F6E\u5BC6\u7801" })] }) })] }, j.id)) })] }), l.jsx(Ct, { page: ce.page, totalPages: ce.totalPages, onPageChange: ce.setPage }), l.jsx(_t, { emptyText: "\u6682\u65E0\u7528\u6237\u3002", filteredText: "\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u7528\u6237", shown: I.length, total: e.users.length })] }), l.jsx(rh, { user: $, onEditUser: z, onOpenAdminReadOnlyPage: e.onOpenAdminReadOnlyPage, onResetPassword: U, onDeleteUser: e.deleteUser })] }), $ && l.jsx(H, { title: `\u4E3A ${$.username} \u521B\u5EFA\u4EE3\u7406`, count: (i == null ? void 0 : i.copies.length) ?? 0, children: i != null && i.copies.length ? l.jsxs(l.Fragment, { children: [l.jsx(ji, { passwordText: "\u4EE3\u7406\u5BC6\u7801\u53EA\u663E\u793A\u8FD9\u4E00\u6B21\uFF0C\u5173\u95ED\u6216\u5237\u65B0\u540E\u4E0D\u80FD\u518D\u6B21\u67E5\u770B\u3002" }), l.jsx("div", { className: "copy-toolbar", children: l.jsx("button", { type: "button", onClick: () => e.copyText(i.copies.join(`
`), `\u5DF2\u590D\u5236 ${i.copies.length} \u6761\u4EE3\u7406\uFF0C\u8BF7\u7ACB\u5373\u4FDD\u5B58\u3002`), children: "\u590D\u5236\u5168\u90E8" }) }), l.jsx("div", { className: "copy-list", children: i.copies.map((j) => {
    const R = wi(j);
    return l.jsxs("div", { className: "copy-row", children: [l.jsxs("div", { className: "copy-content", children: [l.jsx("code", { children: j }), R && l.jsxs("div", { className: "copy-meta", children: [l.jsxs("span", { children: [l.jsx("strong", { children: "\u4E3B\u673A" }), l.jsx("code", { children: R.host })] }), l.jsxs("span", { children: [l.jsx("strong", { children: "\u7AEF\u53E3" }), l.jsx("code", { children: R.port })] }), l.jsxs("span", { children: [l.jsx("strong", { children: "\u7528\u6237\u540D" }), l.jsx("code", { children: R.username })] }), l.jsxs("span", { children: [l.jsx("strong", { children: "\u5BC6\u7801" }), l.jsx("code", { children: R.password })] })] })] }), l.jsx("button", { type: "button", onClick: () => e.copyText(j, "\u5DF2\u590D\u5236\u4EE3\u7406\uFF0C\u8BF7\u7ACB\u5373\u4FDD\u5B58\u3002"), children: "\u590D\u5236\u4EE3\u7406" })] }, j);
  }) })] }) : l.jsxs("form", { className: "form-surface", onSubmit: nn, children: [l.jsxs("div", { className: "section-heading", children: [l.jsx("h2", { children: "\u521B\u5EFA\u4EE3\u7406" }), l.jsx("span", { children: $.username })] }), l.jsx("div", { className: "hint-list", children: l.jsx("span", { children: "\u8FD9\u91CC\u4F1A\u76F4\u63A5\u4E3A\u5F53\u524D\u9009\u4E2D\u7684\u7528\u6237\u521B\u5EFA\u4EE3\u7406\uFF0C\u5BC6\u7801\u4ECD\u7136\u53EA\u4F1A\u663E\u793A\u4E00\u6B21\u3002" }) }), l.jsx(mh, { allowedCountries: $.allowedCountries && $.allowedCountries.length > 0 ? Pe.filter((j) => {
    var R;
    return (R = $.allowedCountries) == null ? void 0 : R.includes(j.value);
  }) : Pe, form: u, isSaving: e.isSaving, setForm: f })] }) }), n && l.jsx(xr, { title: "\u65B0\u5EFA\u7528\u6237", onClose: K, children: a != null && a.initialPassword ? l.jsxs("div", { className: "modal-form", children: [l.jsxs("div", { className: "section-heading", children: [l.jsx("h2", { children: "\u521D\u59CB\u5BC6\u7801\u53EA\u663E\u793A\u8FD9\u4E00\u56DE" }), l.jsx("span", { children: a.user.username })] }), l.jsxs("div", { className: "copy-row", children: [l.jsx("code", { children: a.initialPassword }), l.jsx("button", { type: "button", onClick: () => void e.copyText(a.initialPassword, "\u5DF2\u590D\u5236\u521D\u59CB\u5BC6\u7801\uFF0C\u8BF7\u7ACB\u5373\u4FDD\u5B58\u3002"), children: "\u590D\u5236\u521D\u59CB\u5BC6\u7801" })] }), l.jsx("p", { className: "empty-state", children: "\u8BF7\u73B0\u5728\u4FDD\u5B58\u8FD9\u4E2A\u521D\u59CB\u5BC6\u7801\u3002\u5173\u95ED\u7A97\u53E3\u540E\uFF0C\u7CFB\u7EDF\u4E0D\u4F1A\u518D\u6B21\u663E\u793A\u8FD9\u4E32\u660E\u6587\u5BC6\u7801\u3002" }), l.jsx("div", { className: "modal-actions", children: l.jsx("button", { className: "primary-button", type: "button", onClick: K, children: "\u6211\u5DF2\u4FDD\u5B58" }) })] }) : l.jsxs("form", { className: "modal-form", onSubmit: qe, children: [l.jsxs("div", { className: "form-grid three", children: [l.jsxs("label", { children: ["\u7528\u6237\u540D", l.jsx("span", { className: "field-note", children: "\u767B\u5F55\u65F6\u4F1A\u7528\u8FD9\u4E2A\u540D\u5B57\uFF0C\u5EFA\u8BAE\u7528\u5BB9\u6613\u533A\u5206\u7684\u82F1\u6587\u6216\u6570\u5B57\u3002" }), l.jsx("input", { value: e.userForm.username, onChange: (j) => e.setUserForm({ ...e.userForm, username: j.target.value }), placeholder: "tom" })] }), l.jsxs("label", { children: ["\u521D\u59CB\u5BC6\u7801", l.jsx("span", { className: "field-note", children: "\u53EF\u4E0D\u586B\uFF1B\u7559\u7A7A\u540E\u7CFB\u7EDF\u4F1A\u81EA\u52A8\u751F\u6210\u4E00\u4E2A\u65B0\u5BC6\u7801\uFF0C\u5E76\u4E14\u53EA\u663E\u793A\u4E00\u6B21\u3002" }), l.jsx("input", { autoComplete: "new-password", minLength: 8, type: "text", value: e.userForm.password, onChange: (j) => e.setUserForm({ ...e.userForm, password: j.target.value }), placeholder: "\u4E0D\u586B\u5219\u81EA\u52A8\u751F\u6210" })] }), l.jsxs("label", { children: ["\u603B\u989D\u5EA6 GB", l.jsx("span", { className: "field-note", children: "\u586B 0 \u8868\u793A\u4E0D\u9650\u6D41\u91CF\uFF1B\u586B\u5176\u4ED6\u6570\u5B57\u8868\u793A\u8FD9\u4E2A\u7528\u6237\u603B\u5171\u80FD\u7528\u591A\u5C11 GB\u3002" }), l.jsx("input", { min: "0", type: "number", value: e.userForm.trafficQuotaGb, onChange: (j) => e.setUserForm({ ...e.userForm, trafficQuotaGb: j.target.value }) })] }), l.jsxs("label", { children: ["\u4EE3\u7406\u4E0A\u9650", l.jsx("span", { className: "field-note", children: "\u8868\u793A\u8FD9\u4E2A\u7528\u6237\u6700\u591A\u80FD\u540C\u65F6\u62E5\u6709\u591A\u5C11\u6761\u4EE3\u7406\uFF1B\u586B 0 \u8868\u793A\u4E0D\u9650\u6761\u6570\u3002" }), l.jsx("input", { min: "0", max: "100", type: "number", value: e.userForm.maxProxyEntries, onChange: (j) => e.setUserForm({ ...e.userForm, maxProxyEntries: j.target.value }) })] }), l.jsxs("label", { children: ["\u5E76\u53D1\u4E0A\u9650", l.jsx("span", { className: "field-note", children: "\u586B 0 \u8868\u793A\u4E0D\u9650\u5E76\u53D1\uFF1B\u586B\u5176\u4ED6\u6570\u5B57\u8868\u793A\u6700\u591A\u80FD\u540C\u65F6\u5F00\u591A\u5C11\u4E2A\u4EE3\u7406\u8FDE\u63A5\u3002" }), l.jsx("input", { min: "0", max: "100", type: "number", value: e.userForm.maxConcurrentConnections, onChange: (j) => e.setUserForm({ ...e.userForm, maxConcurrentConnections: j.target.value }) })] })] }), l.jsxs("div", { className: "country-picker", children: [l.jsx("span", { className: "country-picker-title", children: "\u5141\u8BB8\u56FD\u5BB6" }), l.jsx("span", { className: "field-note", children: "\u81F3\u5C11\u4FDD\u7559 1 \u4E2A\u56FD\u5BB6\u3002\u8FD9\u91CC\u52FE\u9009\u54EA\u4E9B\u56FD\u5BB6\uFF0C\u8FD9\u4E2A\u7528\u6237\u4E4B\u540E\u5C31\u53EA\u80FD\u751F\u6210\u8FD9\u4E9B\u56FD\u5BB6\u7684\u4EE3\u7406\u3002" }), l.jsx("div", { className: "country-checkbox-grid", children: Pe.map((j) => {
    const R = e.userForm.allowedCountries.includes(j.value);
    return l.jsxs("label", { className: "country-checkbox", children: [l.jsx("input", { type: "checkbox", checked: R, onChange: (je) => {
      const we = je.target.checked ? [...e.userForm.allowedCountries, j.value] : e.userForm.allowedCountries.filter((at) => at !== j.value);
      e.setUserForm({ ...e.userForm, allowedCountries: we });
    } }), l.jsx("span", { children: j.label })] }, j.value);
  }) })] }), l.jsxs("div", { className: "modal-actions", children: [l.jsx("button", { type: "button", onClick: K, children: "\u53D6\u6D88" }), l.jsx("button", { className: "primary-button", type: "submit", disabled: e.isSaving || !e.userForm.username.trim() || e.userForm.allowedCountries.length < 1, children: "\u65B0\u5EFA\u7528\u6237" })] })] }) }), v && l.jsx(xr, { title: "\u7F16\u8F91\u7528\u6237\u8BBE\u7F6E", onClose: () => p(null), children: l.jsxs("form", { className: "modal-form", onSubmit: E, children: [l.jsxs("div", { className: "section-heading", children: [l.jsx("h2", { children: v.username }), l.jsx("span", { children: "\u53EA\u8C03\u6574\u666E\u901A\u7528\u6237\u7684\u542F\u7528\u72B6\u6001\u3001\u603B\u989D\u5EA6\u3001\u4EE3\u7406\u4E0A\u9650\u548C\u5E76\u53D1\u4E0A\u9650\u3002" })] }), l.jsxs("div", { className: "form-grid three", children: [l.jsxs("label", { children: ["\u72B6\u6001", l.jsx("span", { className: "field-note", children: "\u542F\u7528\u540E\u7528\u6237\u53EF\u4EE5\u6B63\u5E38\u767B\u5F55\u548C\u4F7F\u7528\uFF1B\u505C\u7528\u540E\u7528\u6237\u4E0D\u80FD\u7EE7\u7EED\u4F7F\u7528\u3002" }), l.jsxs("select", { value: g.status, onChange: (j) => m({ ...g, status: j.target.value }), children: [l.jsx("option", { value: "active", children: "\u542F\u7528" }), l.jsx("option", { value: "disabled", children: "\u505C\u7528" })] })] }), l.jsxs("label", { children: ["\u603B\u989D\u5EA6 GB", l.jsx("span", { className: "field-note", children: "\u586B 0 \u8868\u793A\u4E0D\u9650\u6D41\u91CF\uFF1B\u586B\u5176\u4ED6\u6570\u5B57\u8868\u793A\u8FD9\u4E2A\u7528\u6237\u603B\u5171\u8FD8\u80FD\u6309\u8FD9\u4E2A\u4E0A\u9650\u4F7F\u7528\u3002" }), l.jsx("input", { min: "0", step: "0.01", type: "number", value: g.trafficQuotaGb, onChange: (j) => m({ ...g, trafficQuotaGb: j.target.value }) })] }), l.jsxs("label", { children: ["\u4EE3\u7406\u4E0A\u9650", l.jsx("span", { className: "field-note", children: "\u8868\u793A\u8FD9\u4E2A\u7528\u6237\u6700\u591A\u80FD\u540C\u65F6\u4FDD\u7559\u591A\u5C11\u6761\u4EE3\u7406\uFF1B\u586B 0 \u8868\u793A\u4E0D\u9650\u6761\u6570\u3002" }), l.jsx("input", { min: "0", max: "100", type: "number", value: g.maxProxyEntries, onChange: (j) => m({ ...g, maxProxyEntries: j.target.value }) })] }), l.jsxs("label", { children: ["\u5E76\u53D1\u4E0A\u9650", l.jsx("span", { className: "field-note", children: "\u586B 0 \u8868\u793A\u4E0D\u9650\u5E76\u53D1\uFF1B\u586B\u5176\u4ED6\u6570\u5B57\u8868\u793A\u6700\u591A\u80FD\u540C\u65F6\u5F00\u591A\u5C11\u4E2A\u4EE3\u7406\u8FDE\u63A5\u3002" }), l.jsx("input", { min: "0", max: "100", type: "number", value: g.maxConcurrentConnections, onChange: (j) => m({ ...g, maxConcurrentConnections: j.target.value }) })] })] }), l.jsxs("div", { className: "country-picker", children: [l.jsx("span", { className: "country-picker-title", children: "\u5141\u8BB8\u56FD\u5BB6" }), l.jsx("span", { className: "field-note", children: "\u81F3\u5C11\u4FDD\u7559 1 \u4E2A\u56FD\u5BB6\u3002\u8FD9\u91CC\u52FE\u9009\u54EA\u4E9B\u56FD\u5BB6\uFF0C\u7528\u6237\u7AEF\u5C31\u53EA\u80FD\u751F\u6210\u8FD9\u4E9B\u56FD\u5BB6\u7684\u4EE3\u7406\u3002" }), l.jsx("div", { className: "country-checkbox-grid", children: Pe.map((j) => {
    const R = g.allowedCountries.includes(j.value);
    return l.jsxs("label", { className: "country-checkbox", children: [l.jsx("input", { type: "checkbox", checked: R, onChange: (je) => {
      const we = je.target.checked ? [...g.allowedCountries, j.value] : g.allowedCountries.filter((at) => at !== j.value);
      m({ ...g, allowedCountries: we });
    } }), l.jsx("span", { children: j.label })] }, j.value);
  }) })] }), l.jsx("p", { className: "empty-state", children: "\u4FDD\u5B58\u540E\u4F1A\u5199\u5165\u7BA1\u7406\u5458\u64CD\u4F5C\u65E5\u5FD7\uFF1B\u4E0D\u4F1A\u663E\u793A\u6216\u4FDD\u5B58\u4EFB\u4F55\u660E\u6587\u5BC6\u7801\u3002" }), l.jsxs("div", { className: "modal-actions", children: [l.jsx("button", { type: "button", onClick: () => p(null), children: "\u53D6\u6D88" }), l.jsx("button", { className: "primary-button", type: "submit", disabled: e.isSaving || !["active", "disabled"].includes(g.status) || Number(g.trafficQuotaGb) < 0 || g.allowedCountries.length < 1 || Number(g.maxProxyEntries) < 0 || Number(g.maxProxyEntries) > 100 || Number(g.maxConcurrentConnections) < 0 || Number(g.maxConcurrentConnections) > 100, children: "\u4FDD\u5B58\u8BBE\u7F6E" })] })] }) }), x && l.jsx(xr, { title: "\u91CD\u7F6E\u7528\u6237\u5BC6\u7801", onClose: G, children: d != null && d.newPassword ? l.jsxs("div", { className: "modal-form", children: [l.jsxs("div", { className: "section-heading", children: [l.jsx("h2", { children: "\u65B0\u5BC6\u7801\u53EA\u663E\u793A\u8FD9\u4E00\u6B21" }), l.jsx("span", { children: x.username })] }), l.jsxs("div", { className: "copy-row", children: [l.jsx("code", { children: d.newPassword }), l.jsx("button", { type: "button", onClick: () => void e.copyText(d.newPassword ?? "", "\u5DF2\u590D\u5236\u65B0\u5BC6\u7801\uFF0C\u8BF7\u7ACB\u5373\u4FDD\u5B58\u3002"), children: "\u590D\u5236\u65B0\u5BC6\u7801" })] }), l.jsx("p", { className: "empty-state", children: "\u8BF7\u73B0\u5728\u4FDD\u5B58\u8FD9\u4E2A\u65B0\u5BC6\u7801\u3002\u5173\u95ED\u7A97\u53E3\u540E\uFF0C\u7CFB\u7EDF\u4E0D\u4F1A\u518D\u663E\u793A\u8FD9\u4E32\u660E\u6587\u5BC6\u7801\u3002" }), l.jsx("div", { className: "modal-actions", children: l.jsx("button", { className: "primary-button", type: "button", onClick: G, children: "\u6211\u5DF2\u4FDD\u5B58" }) })] }) : l.jsxs("form", { className: "modal-form", onSubmit: Xn, children: [l.jsxs("div", { className: "section-heading", children: [l.jsx("h2", { children: x.username }), l.jsx("span", { children: "\u624B\u586B\u65B0\u5BC6\u7801\uFF0C\u6216\u7559\u7A7A\u81EA\u52A8\u751F\u6210" })] }), l.jsxs("label", { children: ["\u65B0\u5BC6\u7801", l.jsx("span", { className: "field-note", children: "\u53EF\u4E0D\u586B\uFF1B\u7559\u7A7A\u540E\u7CFB\u7EDF\u4F1A\u81EA\u52A8\u751F\u6210\u4E00\u4E2A\u65B0\u5BC6\u7801\u3002\u624B\u52A8\u586B\u5199\u65F6\u81F3\u5C11 8 \u4F4D\u3002" }), l.jsx("input", { autoComplete: "new-password", minLength: 8, type: "text", value: L, onChange: (j) => c(j.target.value), placeholder: "\u4E0D\u586B\u5219\u7CFB\u7EDF\u81EA\u52A8\u751F\u6210" })] }), l.jsxs("div", { className: "modal-actions", children: [l.jsx("button", { type: "button", onClick: G, children: "\u53D6\u6D88" }), l.jsx("button", { className: "primary-button", type: "submit", disabled: e.isSaving || L.length > 0 && L.trim().length < 8, children: "\u786E\u8BA4\u91CD\u7F6E" })] })] }) })] });
}
function rh(e) {
  if (!e.user) return l.jsx(H, { title: "\u7528\u6237\u8BE6\u60C5", children: l.jsx(Pt, { text: "\u8BF7\u9009\u62E9\u4E00\u4E2A\u7528\u6237\u3002" }) });
  const t = e.user;
  return l.jsxs("aside", { className: "detail-panel", children: [l.jsxs("div", { className: "section-heading", children: [l.jsx("h2", { children: "\u7528\u6237\u8BE6\u60C5" }), l.jsx(dt, { status: t.status })] }), l.jsxs("div", { className: "detail-title", children: [l.jsx("strong", { children: t.username }), l.jsxs("span", { children: ["\u7528\u6237 ID #", t.id] })] }), l.jsxs("div", { className: "detail-grid", children: [l.jsx(B, { label: "\u5DF2\u7528\u6D41\u91CF", value: re(t.trafficUsedBytes) }), l.jsx(B, { label: "\u603B\u989D\u5EA6", value: td(t.trafficQuotaBytes) }), l.jsx(B, { label: "\u5269\u4F59\u989D\u5EA6", value: ed(t.trafficQuotaBytes, t.trafficUsedBytes) }), l.jsx(B, { label: "\u4EE3\u7406\u6570\u91CF", value: `${t.proxyEntryCount}/${t.maxProxyEntries > 0 ? t.maxProxyEntries : "\u4E0D\u9650"}` }), l.jsx(B, { label: "\u5E76\u53D1\u4E0A\u9650", value: String(t.maxConcurrentConnections) }), l.jsx(B, { label: "\u5141\u8BB8\u56FD\u5BB6", value: Sh(t.allowedCountries) }), l.jsx(B, { label: "\u521B\u5EFA\u65F6\u95F4", value: It(t.createdAt) })] }), l.jsxs("div", { className: "deferred-actions", children: [l.jsx("p", { children: "\u8FD9\u91CC\u53EF\u4EE5\u76F4\u63A5\u8FDB\u5165\u5E38\u7528\u7BA1\u7406\u52A8\u4F5C\u3002\u5220\u9664\u4ECD\u7136\u5C5E\u4E8E\u5371\u9669\u64CD\u4F5C\uFF0C\u5148\u4FDD\u6301\u7981\u7528\u3002" }), l.jsxs(Yn, { children: [l.jsx("button", { type: "button", onClick: () => e.onOpenAdminReadOnlyPage("proxies", { search: t.username }), children: "\u67E5\u770B\u4EE3\u7406" }), l.jsx("button", { type: "button", onClick: () => e.onOpenAdminReadOnlyPage("logs", { search: t.username }), children: "\u67E5\u770B\u65E5\u5FD7" }), l.jsx("button", { type: "button", onClick: () => e.onEditUser(t), children: "\u7F16\u8F91\u8BBE\u7F6E" }), l.jsx("button", { type: "button", onClick: () => e.onResetPassword(t), children: "\u91CD\u7F6E\u5BC6\u7801" }), l.jsx("button", { type: "button", disabled: t.role !== "user", onClick: () => {
    window.confirm("\u786E\u5B9A\u6C38\u4E45\u5220\u9664\u7528\u6237\u201C" + t.username + "\u201D\uFF1F\u5C06\u4E00\u5E76\u5220\u9664 TA \u7684\u5168\u90E8\u4EE3\u7406\u4E0E\u6D41\u91CF\u8BB0\u5F55\uFF0C\u4E0D\u53EF\u6062\u590D\u3002") && e.onDeleteUser(t.id);
  }, children: "\u5220\u9664" })] })] })] });
}
function lh(e) {
  var t;
  const [n, r] = C.useState(false), [a, s] = C.useState(((t = e.upstreams[0]) == null ? void 0 : t.id) ?? null), [i, o] = C.useState(""), [u, f] = C.useState("all"), [v, p] = C.useState("all"), g = [...new Set(e.upstreams.map((c) => c.country).filter(Boolean))].sort(), m = e.upstreams.filter((c) => {
    const d = i.trim().toLowerCase(), h = !d || c.host.toLowerCase().includes(d) || c.username.toLowerCase().includes(d) || String(c.id).includes(d) || (c.currentIp || "").toLowerCase().includes(d), b = u === "all" || c.status === u, S = v === "all" || c.country === v;
    return h && b && S;
  }), x = Tt(m, 8), y = m.find((c) => c.id === a) ?? m[0] ?? null, L = !!i.trim() || u !== "all" || v !== "all";
  return C.useEffect(() => {
    e.readOnlyIntent && (e.readOnlyIntent.search && o(e.readOnlyIntent.search), e.readOnlyIntent.country && p(e.readOnlyIntent.country), f("all"), e.setReadOnlyIntent(null));
  }, [e.readOnlyIntent, e.setReadOnlyIntent]), l.jsxs(l.Fragment, { children: [l.jsxs("section", { className: "metric-grid compact", children: [l.jsx(M, { label: "\u603B\u4E0A\u6E38", value: String(e.upstreams.length) }), l.jsx(M, { label: "\u7A7A\u95F2", value: String(e.upstreamStats.free ?? 0) }), l.jsx(M, { label: "\u5DF2\u7ED1\u5B9A", value: String(e.upstreamStats.locked ?? 0) }), l.jsx(M, { label: "\u51B7\u5374", value: String(e.upstreamStats.cooldown ?? 0) }), l.jsx(M, { label: "\u5931\u8D25/\u7981\u7528", value: String((e.upstreamStats.bad ?? 0) + (e.upstreamStats.disabled ?? 0)) })] }), l.jsxs("section", { className: "split-grid", children: [l.jsx(H, { title: "\u4E0A\u6E38\u72B6\u6001\u5206\u5E03", children: l.jsx(Zc, { items: [{ label: "\u7A7A\u95F2", value: e.upstreamStats.free ?? 0, tone: "ok" }, { label: "\u5DF2\u7ED1\u5B9A", value: e.upstreamStats.locked ?? 0, tone: "info" }, { label: "\u51B7\u5374", value: e.upstreamStats.cooldown ?? 0, tone: "warn" }, { label: "\u5931\u8D25", value: e.upstreamStats.bad ?? 0, tone: "bad" }, { label: "\u7981\u7528", value: e.upstreamStats.disabled ?? 0, tone: "muted" }] }) }), l.jsx(H, { title: "\u56FD\u5BB6\u5E93\u5B58", children: l.jsx(xh, { upstreams: e.upstreams }) })] }), l.jsxs("section", { className: "action-strip", children: [l.jsxs("div", { children: [l.jsx("h2", { children: "\u4E0A\u6E38\u8D44\u6E90\u5DE5\u4F5C\u533A" }), l.jsx("p", { children: "\u5148\u770B\u5E93\u5B58\u548C\u5F02\u5E38\uFF0C\u518D\u7528\u7B5B\u9009\u5B9A\u4F4D\u5177\u4F53\u4E0A\u6E38\u3002\u5BFC\u5165\u5165\u53E3\u6536\u8FDB\u5F39\u7A97\uFF0C\u907F\u514D\u9875\u9762\u88AB\u8868\u5355\u6491\u957F\u3002" })] }), l.jsx("button", { className: "primary-button", type: "button", onClick: () => r(true), children: "\u5BFC\u5165\u4E0A\u6E38" })] }), e.importResult && l.jsx(H, { title: "\u6700\u8FD1\u5BFC\u5165\u7ED3\u679C", children: l.jsxs("div", { className: "result-list inline", children: [l.jsxs("span", { children: ["\u65B0\u589E ", e.importResult.created] }), l.jsxs("span", { children: ["\u91CD\u590D ", e.importResult.duplicates] }), l.jsxs("span", { children: ["\u5931\u8D25 ", e.importResult.failed] })] }) }), l.jsxs("section", { className: "master-detail", children: [l.jsxs(H, { title: "\u4E0A\u6E38\u8D44\u6E90", count: m.length, children: [l.jsx("div", { className: "hint-list", children: l.jsx("span", { children: "\u641C\u7D22\u53EF\u4EE5\u8F93\u5165\u4E0A\u6E38 ID\u3001host\u3001\u7528\u6237\u540D\u6216\u51FA\u53E3 IP\uFF1B\u72B6\u6001\u548C\u56FD\u5BB6\u7B5B\u9009\u53EF\u4EE5\u4E00\u8D77\u7528\u3002" }) }), l.jsxs("div", { className: "table-tools", children: [l.jsxs("label", { children: ["\u641C\u7D22", l.jsx("input", { value: i, onChange: (c) => o(c.target.value), placeholder: "ID\u3001host\u3001\u7528\u6237\u540D\u3001\u51FA\u53E3 IP" })] }), l.jsxs("label", { children: ["\u72B6\u6001", l.jsxs("select", { value: u, onChange: (c) => f(c.target.value), children: [l.jsx("option", { value: "all", children: "\u5168\u90E8\u72B6\u6001" }), l.jsx("option", { value: "free", children: "\u7A7A\u95F2" }), l.jsx("option", { value: "locked", children: "\u5DF2\u7ED1\u5B9A" }), l.jsx("option", { value: "cooldown", children: "\u51B7\u5374" }), l.jsx("option", { value: "bad", children: "\u5931\u8D25" }), l.jsx("option", { value: "disabled", children: "\u7981\u7528" })] })] }), l.jsxs("label", { children: ["\u56FD\u5BB6", l.jsxs("select", { value: v, onChange: (c) => p(c.target.value), children: [l.jsx("option", { value: "all", children: "\u5168\u90E8\u56FD\u5BB6" }), g.map((c) => l.jsx("option", { value: c, children: c.toUpperCase() }, c))] })] }), L && l.jsx("button", { type: "button", onClick: () => {
    o(""), f("all"), p("all");
  }, children: "\u91CD\u7F6E\u7B5B\u9009" })] }), l.jsx(Et, { items: [{ label: "\u641C\u7D22", value: i.trim() || null, onClear: i.trim() ? () => o("") : null }, { label: "\u72B6\u6001", value: u === "all" ? null : Lt(u), onClear: u === "all" ? null : () => f("all") }, { label: "\u56FD\u5BB6", value: v === "all" ? null : v.toUpperCase(), onClear: v === "all" ? null : () => p("all") }] }), l.jsx(Nt, { shown: m.length, total: e.upstreams.length }), l.jsxs(St, { minWidth: 760, maxHeight: 500, children: [l.jsx("thead", { children: l.jsxs("tr", { children: [l.jsx("th", { children: "ID" }), l.jsx("th", { children: "\u4E0A\u6E38" }), l.jsx("th", { children: "\u72B6\u6001" }), l.jsx("th", { children: "\u51FA\u53E3 IP" }), l.jsx("th", { children: "\u5730\u533A" }), l.jsx("th", { children: "\u5EF6\u8FDF" }), l.jsx("th", { children: "\u6700\u540E\u68C0\u6D4B" }), l.jsx("th", { children: "\u64CD\u4F5C" })] }) }), l.jsx("tbody", { children: x.rows.map((c) => l.jsxs("tr", { className: (y == null ? void 0 : y.id) === c.id ? "selected-row" : void 0, children: [l.jsxs("td", { children: ["#", c.id] }), l.jsx("td", { children: l.jsxs("strong", { children: [c.host, ":", c.port] }) }), l.jsx("td", { children: l.jsx(dt, { status: c.status }) }), l.jsx("td", { children: c.currentIp || "\u672A\u68C0\u6D4B" }), l.jsx("td", { children: pe(c.country, c.region, c.city) }), l.jsx("td", { children: nd(c.latencyMs) }), l.jsx("td", { children: It(c.lastCheckedAt) }), l.jsx("td", { children: l.jsx("button", { type: "button", onClick: () => s(c.id), children: "\u67E5\u770B" }) })] }, c.id)) })] }), l.jsx(Ct, { page: x.page, totalPages: x.totalPages, onPageChange: x.setPage }), l.jsx(_t, { emptyText: "\u6682\u65E0\u4E0A\u6E38\u8D44\u6E90\u3002", filteredText: "\u6CA1\u6709\u7B26\u5408\u7B5B\u9009\u6761\u4EF6\u7684\u4E0A\u6E38\u8D44\u6E90", shown: m.length, total: e.upstreams.length })] }), l.jsx(ah, { onOpenAdminReadOnlyPage: e.onOpenAdminReadOnlyPage, upstream: y, onDeleteUpstream: e.deleteUpstream, onUpdateUpstreamStatus: e.updateUpstreamStatus })] }), n && l.jsx(xr, { title: "\u5BFC\u5165\u4E0A\u6E38", onClose: () => r(false), children: l.jsxs("form", { className: "modal-form", onSubmit: e.importUpstreams, children: [l.jsxs("label", { children: ["\u4E0A\u6E38\u5217\u8868", l.jsx("span", { className: "field-note", children: "\u4E00\u884C\u586B\u4E00\u6761\uFF0C\u683C\u5F0F\u56FA\u5B9A\u4E3A `host:port:username:password`\u3002" }), l.jsx("span", { className: "field-note", children: "\u91CD\u590D\u7684\u4E0A\u6E38\u4E0D\u4F1A\u91CD\u590D\u521B\u5EFA\uFF1B\u683C\u5F0F\u4E0D\u5BF9\u7684\u884C\u4F1A\u8BB0\u5230\u5931\u8D25\u7ED3\u679C\u91CC\u3002" }), l.jsx("textarea", { value: e.upstreamText, onChange: (c) => e.setUpstreamText(c.target.value), placeholder: "host:port:username:password" })] }), l.jsxs("div", { className: "modal-actions", children: [l.jsx("button", { type: "button", onClick: () => r(false), children: "\u53D6\u6D88" }), l.jsx("button", { className: "primary-button", type: "submit", disabled: e.isSaving || !e.upstreamText.trim(), children: "\u5BFC\u5165\u4E0A\u6E38" })] })] }) })] });
}
function ah(e) {
  return e.upstream ? l.jsxs("aside", { className: "detail-panel", children: [l.jsxs("div", { className: "section-heading", children: [l.jsx("h2", { children: "\u4E0A\u6E38\u8BE6\u60C5" }), l.jsx(dt, { status: e.upstream.status })] }), l.jsxs("div", { className: "detail-title", children: [l.jsxs("strong", { children: ["#", e.upstream.id] }), l.jsxs("span", { children: [e.upstream.host, ":", e.upstream.port] })] }), l.jsxs("div", { className: "detail-grid", children: [l.jsx(B, { label: "\u7528\u6237\u540D", value: e.upstream.username }), l.jsx(B, { label: "\u51FA\u53E3 IP", value: e.upstream.currentIp || "\u672A\u68C0\u6D4B" }), l.jsx(B, { label: "\u5730\u533A", value: pe(e.upstream.country, e.upstream.region, e.upstream.city) }), l.jsx(B, { label: "\u5EF6\u8FDF", value: nd(e.upstream.latencyMs) }), l.jsx(B, { label: "\u6210\u529F/\u5931\u8D25", value: `${e.upstream.successCount}/${e.upstream.failCount}` }), l.jsx(B, { label: "\u6700\u540E\u68C0\u6D4B", value: It(e.upstream.lastCheckedAt) }), l.jsx(B, { label: "\u6700\u540E\u9519\u8BEF", value: e.upstream.lastErrorType || "\u65E0" }), l.jsx(B, { label: "\u8BC4\u5206", value: String(e.upstream.score) })] }), l.jsxs("div", { className: "deferred-actions", children: [l.jsx("p", { children: "\u5371\u9669\u64CD\u4F5C\u6682\u7F13\u5230\u5B89\u5168\u64CD\u4F5C\u4F1A\u8BDD\u5904\u7406\u3002" }), l.jsxs(Yn, { children: [l.jsx("button", { type: "button", onClick: () => {
    var t;
    return e.onOpenAdminReadOnlyPage("proxies", { country: ((t = e.upstream) == null ? void 0 : t.country) ?? null, search: e.upstream ? String(e.upstream.id) : "" });
  }, children: "\u67E5\u770B\u4EE3\u7406" }), l.jsx("button", { type: "button", onClick: () => e.onOpenAdminReadOnlyPage("logs", { search: e.upstream ? String(e.upstream.id) : "" }), children: "\u67E5\u770B\u65E5\u5FD7" }), l.jsx(et, { label: "\u68C0\u6D4B" }), l.jsx("button", { type: "button", onClick: () => {
    var t = e.upstream.status === "disabled" ? "free" : "disabled";
    (t === "free" || window.confirm("\u786E\u5B9A\u505C\u7528\u8FD9\u6761\u4E0A\u6E38\uFF1F\u505C\u7528\u540E\u4E0D\u4F1A\u518D\u88AB\u626B\u63CF\u6216\u5206\u914D\u7ED9\u4EE3\u7406\uFF1B\u5982\u679C\u5F53\u524D\u6709\u7ED1\u5B9A\u4F1A\u88AB\u91CA\u653E\u3002")) && e.onUpdateUpstreamStatus(e.upstream.id, t);
  }, children: e.upstream.status === "disabled" ? "\u542F\u7528" : "\u7981\u7528" }), l.jsx("button", { type: "button", onClick: () => {
    window.confirm("\u786E\u5B9A\u6C38\u4E45\u5220\u9664\u8FD9\u6761\u4E0A\u6E38\uFF08" + e.upstream.host + ":" + e.upstream.port + "\uFF09\uFF1F\u4E0D\u53EF\u6062\u590D\u3002") && e.onDeleteUpstream(e.upstream.id);
  }, children: "\u5220\u9664" })] })] })] }) : l.jsx(H, { title: "\u4E0A\u6E38\u8BE6\u60C5", children: l.jsx(Pt, { text: "\u8BF7\u9009\u62E9\u4E00\u6761\u4E0A\u6E38\u8D44\u6E90\u3002" }) });
}
function sh(e) {
  var t;
  const [n, r] = C.useState(((t = e.regions[0]) == null ? void 0 : t.key) ?? null), [a, s] = C.useState(""), [i, o] = C.useState("all"), u = e.regions.filter((m) => {
    const x = a.trim().toLowerCase(), y = !x || m.label.toLowerCase().includes(x) || m.key.toLowerCase().includes(x), L = i === "all" || i === "low" && m.free < 2 || i === "healthy" && m.free >= 2;
    return y && L;
  }), f = Tt(u, 8), v = u.find((m) => m.key === n) ?? u[0] ?? null, p = e.regions.filter((m) => m.free < 2), g = !!a.trim() || i !== "all";
  return l.jsxs(l.Fragment, { children: [l.jsxs("section", { className: "metric-grid compact", children: [l.jsx(M, { label: "\u5730\u533A\u6570", value: String(e.regions.length) }), l.jsx(M, { label: "\u4F4E\u5E93\u5B58", value: String(p.length), tone: p.length > 0 ? "warn" : void 0 }), l.jsx(M, { label: "\u53EF\u7528\u4E0A\u6E38", value: String(e.regions.reduce((m, x) => m + x.free, 0)) }), l.jsx(M, { label: "\u5DF2\u7ED1\u5B9A", value: String(e.regions.reduce((m, x) => m + x.locked, 0)) }), l.jsx(M, { label: "\u51B7\u5374/\u5931\u8D25", value: String(e.regions.reduce((m, x) => m + x.bad, 0)) })] }), l.jsx("section", { className: "action-strip", children: l.jsxs("div", { children: [l.jsx("h2", { children: "\u5730\u533A\u5E93\u5B58\u5DE5\u4F5C\u533A" }), l.jsx("p", { children: "\u5148\u627E\u4F4E\u5E93\u5B58\u5730\u533A\uFF0C\u518D\u67E5\u770B\u5BF9\u5E94\u5E93\u5B58\u6784\u6210\u3002\u68C0\u6D4B\u5730\u533A\u7B49\u5371\u9669\u52A8\u4F5C\u5148\u653E\u5728\u8BE6\u60C5\u91CC\u7981\u7528\u3002" })] }) }), l.jsxs("section", { className: "master-detail", children: [l.jsxs(H, { title: "\u5730\u533A\u5E93\u5B58", count: u.length, children: [l.jsx("div", { className: "hint-list", children: l.jsx("span", { children: "\u641C\u7D22\u53EF\u4EE5\u8F93\u5165\u56FD\u5BB6\u3001\u5730\u533A\u3001\u57CE\u5E02\u6216\u5E93\u5B58\u952E\uFF1B\u5E93\u5B58\u72B6\u6001\u53EF\u4EE5\u7528\u6765\u53EA\u770B\u4F4E\u5E93\u5B58\u6216\u5E93\u5B58\u5145\u8DB3\u7684\u5730\u533A\u3002" }) }), l.jsxs("div", { className: "table-tools", children: [l.jsxs("label", { children: ["\u641C\u7D22", l.jsx("input", { value: a, onChange: (m) => s(m.target.value), placeholder: "\u56FD\u5BB6\u3001\u5730\u533A\u3001\u57CE\u5E02\u3001\u5E93\u5B58\u952E" })] }), l.jsxs("label", { children: ["\u5E93\u5B58\u72B6\u6001", l.jsxs("select", { value: i, onChange: (m) => o(m.target.value), children: [l.jsx("option", { value: "all", children: "\u5168\u90E8\u5E93\u5B58" }), l.jsx("option", { value: "low", children: "\u4F4E\u5E93\u5B58" }), l.jsx("option", { value: "healthy", children: "\u5E93\u5B58\u5145\u8DB3" })] })] }), g && l.jsx("button", { type: "button", onClick: () => {
    s(""), o("all");
  }, children: "\u91CD\u7F6E\u7B5B\u9009" })] }), l.jsx(Et, { items: [{ label: "\u641C\u7D22", value: a.trim() || null, onClear: a.trim() ? () => s("") : null }, { label: "\u5E93\u5B58\u72B6\u6001", value: i === "all" ? null : i === "low" ? "\u4F4E\u5E93\u5B58" : "\u5E93\u5B58\u5145\u8DB3", onClear: i === "all" ? null : () => o("all") }] }), l.jsx(Nt, { shown: u.length, total: e.regions.length }), l.jsxs(St, { minWidth: 680, maxHeight: 500, children: [l.jsx("thead", { children: l.jsxs("tr", { children: [l.jsx("th", { children: "\u5730\u533A" }), l.jsx("th", { children: "\u53EF\u7528" }), l.jsx("th", { children: "\u5DF2\u7ED1\u5B9A" }), l.jsx("th", { children: "\u51B7\u5374/\u5931\u8D25" }), l.jsx("th", { children: "\u5E93\u5B58\u72B6\u6001" }), l.jsx("th", { children: "\u64CD\u4F5C" })] }) }), l.jsx("tbody", { children: f.rows.map((m) => l.jsxs("tr", { className: (v == null ? void 0 : v.key) === m.key ? "selected-row" : void 0, children: [l.jsx("td", { children: l.jsx("strong", { children: m.label }) }), l.jsx("td", { children: m.free }), l.jsx("td", { children: m.locked }), l.jsx("td", { children: m.bad }), l.jsx("td", { children: l.jsx(dt, { status: m.free < 2 ? "low" : "healthy" }) }), l.jsx("td", { children: l.jsx("button", { type: "button", onClick: () => r(m.key), children: "\u67E5\u770B" }) })] }, m.key)) })] }), l.jsx(Ct, { page: f.page, totalPages: f.totalPages, onPageChange: f.setPage }), l.jsx(_t, { emptyText: "\u6682\u65E0\u5730\u533A\u5E93\u5B58\u3002", filteredText: "\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u5730\u533A\u5E93\u5B58", shown: u.length, total: e.regions.length })] }), l.jsx(oh, { onOpenAdminReadOnlyPage: e.onOpenAdminReadOnlyPage, region: v })] })] });
}
function ih(e) {
  var t;
  const [n, r] = C.useState(""), [a, s] = C.useState("all"), [i, o] = C.useState("all"), [u, f] = C.useState(((t = e.entries[0]) == null ? void 0 : t.id) ?? null), v = [...new Set(e.entries.map((y) => y.targetCountry).filter(Boolean))].sort(), p = e.entries.filter((y) => {
    const L = n.trim().toLowerCase(), c = !L || y.username.toLowerCase().includes(L) || y.user.username.toLowerCase().includes(L) || String(y.id).includes(L) || String(y.currentUpstreamId ?? "").includes(L) || (y.currentIp || "").toLowerCase().includes(L) || pe(y.targetCountry, y.targetRegion, y.targetCity).toLowerCase().includes(L), d = a === "all" || y.status === a, h = i === "all" || y.targetCountry === i;
    return c && d && h;
  }), g = Tt(p, 8), m = p.find((y) => y.id === u) ?? p[0] ?? null, x = !!n.trim() || a !== "all" || i !== "all";
  return C.useEffect(() => {
    e.readOnlyIntent && (e.readOnlyIntent.search && r(e.readOnlyIntent.search), e.readOnlyIntent.country && o(e.readOnlyIntent.country), s("all"), e.setReadOnlyIntent(null));
  }, [e.readOnlyIntent, e.setReadOnlyIntent]), l.jsxs(l.Fragment, { children: [l.jsxs("section", { className: "metric-grid compact", children: [l.jsx(M, { label: "\u4EE3\u7406\u603B\u6570", value: String(e.entries.length) }), l.jsx(M, { label: "\u542F\u7528", value: String(e.entries.filter((y) => y.status === "active").length) }), l.jsx(M, { label: "\u505C\u7528", value: String(e.entries.filter((y) => y.status === "disabled").length) }), l.jsx(M, { label: "\u6D3B\u8DC3\u8FDE\u63A5", value: String(e.entries.reduce((y, L) => y + L.activeConnections, 0)) }), l.jsx(M, { label: "\u5DF2\u7528\u6D41\u91CF", value: re(String(xt(e.entries.map((y) => y.trafficUsedBytes)))) })] }), l.jsx("section", { className: "action-strip", children: l.jsxs("div", { children: [l.jsx("h2", { children: "\u4EE3\u7406\u8FD0\u884C\u5DE5\u4F5C\u533A" }), l.jsx("p", { children: "\u5148\u770B\u4EE3\u7406\u72B6\u6001\u3001\u6D41\u91CF\u548C\u8FDE\u63A5\u6570\uFF0C\u518D\u67E5\u770B\u5355\u6761\u4EE3\u7406\u8BE6\u60C5\u3002\u91CD\u7ED1\u3001\u7981\u7528\u3001\u5220\u9664\u5148\u653E\u5728\u8BE6\u60C5\u91CC\u7981\u7528\u3002" })] }) }), l.jsxs("section", { className: "master-detail", children: [l.jsxs(H, { title: "\u4EE3\u7406\u8FD0\u884C", count: p.length, children: [l.jsx("div", { className: "hint-list", children: l.jsx("span", { children: "\u641C\u7D22\u53EF\u4EE5\u8F93\u5165\u4EE3\u7406\u8D26\u53F7\u3001\u6240\u5C5E\u7528\u6237\u3001\u51FA\u53E3 IP \u6216\u5730\u533A\uFF1B\u72B6\u6001\u548C\u56FD\u5BB6\u7B5B\u9009\u53EF\u4EE5\u4E00\u8D77\u7528\u3002" }) }), l.jsxs("div", { className: "table-tools", children: [l.jsxs("label", { children: ["\u641C\u7D22", l.jsx("input", { value: n, onChange: (y) => r(y.target.value), placeholder: "ID\u3001\u4EE3\u7406\u8D26\u53F7\u3001\u7528\u6237\u3001\u51FA\u53E3 IP" })] }), l.jsxs("label", { children: ["\u72B6\u6001", l.jsxs("select", { value: a, onChange: (y) => s(y.target.value), children: [l.jsx("option", { value: "all", children: "\u5168\u90E8\u72B6\u6001" }), l.jsx("option", { value: "active", children: "\u542F\u7528" }), l.jsx("option", { value: "disabled", children: "\u505C\u7528" }), l.jsx("option", { value: "dead", children: "\u5931\u6548" })] })] }), l.jsxs("label", { children: ["\u56FD\u5BB6", l.jsxs("select", { value: i, onChange: (y) => o(y.target.value), children: [l.jsx("option", { value: "all", children: "\u5168\u90E8\u56FD\u5BB6" }), v.map((y) => l.jsx("option", { value: y, children: y.toUpperCase() }, y))] })] }), x && l.jsx("button", { type: "button", onClick: () => {
    r(""), s("all"), o("all");
  }, children: "\u91CD\u7F6E\u7B5B\u9009" })] }), l.jsx(Et, { items: [{ label: "\u641C\u7D22", value: n.trim() || null, onClear: n.trim() ? () => r("") : null }, { label: "\u72B6\u6001", value: a === "all" ? null : Lt(a), onClear: a === "all" ? null : () => s("all") }, { label: "\u56FD\u5BB6", value: i === "all" ? null : i.toUpperCase(), onClear: i === "all" ? null : () => o("all") }] }), l.jsx(Nt, { shown: p.length, total: e.entries.length }), l.jsxs(St, { minWidth: 760, maxHeight: 500, children: [l.jsx("thead", { children: l.jsxs("tr", { children: [l.jsx("th", { children: "\u4EE3\u7406\u8D26\u53F7" }), l.jsx("th", { children: "\u7528\u6237" }), l.jsx("th", { children: "\u76EE\u6807\u5730\u533A" }), l.jsx("th", { children: "\u72B6\u6001" }), l.jsx("th", { children: "\u6D41\u91CF" }), l.jsx("th", { children: "\u8FDE\u63A5" }), l.jsx("th", { children: "\u64CD\u4F5C" })] }) }), l.jsx("tbody", { children: g.rows.map((y) => l.jsxs("tr", { className: (m == null ? void 0 : m.id) === y.id ? "selected-row" : void 0, children: [l.jsx("td", { children: l.jsx("strong", { children: y.username }) }), l.jsx("td", { children: y.user.username }), l.jsx("td", { children: pe(y.targetCountry, y.targetRegion, y.targetCity) }), l.jsx("td", { children: l.jsx(dt, { status: y.status }) }), l.jsx("td", { children: re(y.trafficUsedBytes) }), l.jsx("td", { children: y.activeConnections }), l.jsx("td", { children: l.jsx("button", { type: "button", onClick: () => f(y.id), children: "\u67E5\u770B" }) })] }, y.id)) })] }), l.jsx(Ct, { page: g.page, totalPages: g.totalPages, onPageChange: g.setPage }), l.jsx(_t, { emptyText: "\u6682\u65E0\u4EE3\u7406\u8FD0\u884C\u8BB0\u5F55\u3002", filteredText: "\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u4EE3\u7406\u8FD0\u884C\u8BB0\u5F55", shown: p.length, total: e.entries.length })] }), l.jsx(uh, { entry: m, isSaving: e.isSaving, onOpenAdminReadOnlyPage: e.onOpenAdminReadOnlyPage, updateProxyEntryStatus: e.updateProxyEntryStatus, onDeleteProxyEntry: e.deleteProxyEntry })] })] });
}
function oh(e) {
  return e.region ? l.jsxs("aside", { className: "detail-panel", children: [l.jsxs("div", { className: "section-heading", children: [l.jsx("h2", { children: "\u5730\u533A\u8BE6\u60C5" }), l.jsx(dt, { status: e.region.free < 2 ? "low" : "healthy" })] }), l.jsxs("div", { className: "detail-title", children: [l.jsx("strong", { children: e.region.label }), l.jsxs("span", { children: ["\u5E93\u5B58\u952E\uFF1A", e.region.key] })] }), l.jsxs("div", { className: "detail-grid", children: [l.jsx(B, { label: "\u603B\u4E0A\u6E38", value: String(e.region.total) }), l.jsx(B, { label: "\u53EF\u7528\u4E0A\u6E38", value: String(e.region.free) }), l.jsx(B, { label: "\u5DF2\u7ED1\u5B9A", value: String(e.region.locked) }), l.jsx(B, { label: "\u51B7\u5374/\u5931\u8D25", value: String(e.region.bad) }), l.jsx(B, { label: "\u5E93\u5B58\u72B6\u6001", value: e.region.free < 2 ? "\u504F\u4F4E" : "\u5145\u8DB3" })] }), l.jsxs("div", { className: "deferred-actions", children: [l.jsx("p", { children: "\u67E5\u770B\u4E0A\u6E38\u3001\u67E5\u770B\u4EE3\u7406\u3001\u68C0\u6D4B\u5730\u533A\u540E\u7EED\u9700\u8981\u548C\u7B5B\u9009\u8DF3\u8F6C\u3001\u626B\u63CF\u4EFB\u52A1\u3001\u64CD\u4F5C\u65E5\u5FD7\u4E00\u8D77\u505A\u3002" }), l.jsxs(Yn, { children: [l.jsx("button", { type: "button", onClick: () => {
    var t, n;
    return e.onOpenAdminReadOnlyPage("upstreams", { country: ((t = e.region) == null ? void 0 : t.country) ?? null, search: ((n = e.region) == null ? void 0 : n.label) ?? "" });
  }, children: "\u67E5\u770B\u4E0A\u6E38" }), l.jsx("button", { type: "button", onClick: () => {
    var t, n;
    return e.onOpenAdminReadOnlyPage("proxies", { country: ((t = e.region) == null ? void 0 : t.country) ?? null, search: ((n = e.region) == null ? void 0 : n.label) ?? "" });
  }, children: "\u67E5\u770B\u4EE3\u7406" }), l.jsx("button", { type: "button", onClick: () => {
    var t;
    return e.onOpenAdminReadOnlyPage("logs", { search: ((t = e.region) == null ? void 0 : t.label) ?? "" });
  }, children: "\u67E5\u770B\u65E5\u5FD7" }), l.jsx(et, { label: "\u68C0\u6D4B\u5730\u533A" })] })] })] }) : l.jsx(H, { title: "\u5730\u533A\u8BE6\u60C5", children: l.jsx(Pt, { text: "\u8BF7\u9009\u62E9\u4E00\u4E2A\u5730\u533A\u3002" }) });
}
function uh(e) {
  const [t, n] = C.useState(null), [r, a] = C.useState(null);
  if (!e.entry && !t) return l.jsx(H, { title: "\u4EE3\u7406\u8BE6\u60C5", children: l.jsx(Pt, { text: "\u8BF7\u9009\u62E9\u4E00\u6761\u4EE3\u7406\u3002" }) });
  const s = e.entry, i = (s == null ? void 0 : s.status) === "active" ? "disabled" : "active", o = i === "disabled" ? "\u505C\u7528\u4EE3\u7406" : "\u542F\u7528\u4EE3\u7406";
  async function u() {
    if (!t) return;
    a(null);
    const f = await e.updateProxyEntryStatus(t.entryId, t.status);
    f.ok ? (n(null), a(null)) : a(f.error || "\u4FEE\u6539\u4EE3\u7406\u72B6\u6001\u5931\u8D25");
  }
  return l.jsxs(l.Fragment, { children: [s ? l.jsxs("aside", { className: "detail-panel", children: [l.jsxs("div", { className: "section-heading", children: [l.jsx("h2", { children: "\u4EE3\u7406\u8BE6\u60C5" }), l.jsx(dt, { status: s.status })] }), l.jsxs("div", { className: "detail-title", children: [l.jsxs("strong", { children: ["#", s.id] }), l.jsx("span", { children: s.username })] }), l.jsxs("div", { className: "detail-grid", children: [l.jsx(B, { label: "\u6240\u5C5E\u7528\u6237", value: s.user.username }), l.jsx(B, { label: "\u76EE\u6807\u5730\u533A", value: pe(s.targetCountry, s.targetRegion, s.targetCity) }), l.jsx(B, { label: "\u5F53\u524D\u51FA\u53E3 IP", value: s.currentIp || "\u672A\u7ED1\u5B9A" }), l.jsx(B, { label: "\u5F53\u524D\u5730\u533A", value: pe(s.currentCountry, s.currentRegion, s.currentCity) }), l.jsx(B, { label: "\u5DF2\u7528\u6D41\u91CF", value: re(s.trafficUsedBytes) }), l.jsx(B, { label: "\u6D3B\u8DC3\u8FDE\u63A5", value: String(s.activeConnections) }), l.jsx(B, { label: "\u5F53\u524D\u4E0A\u6E38", value: s.lockedUpstream ? `#${s.lockedUpstream.id}` : "\u65E0" }), l.jsx(B, { label: "\u6700\u540E\u4F7F\u7528", value: It(s.lastUsedAt) }), l.jsx(B, { label: "\u6700\u540E\u68C0\u6D4B", value: It(s.lastCheckedAt) })] }), l.jsxs("div", { className: "deferred-actions", children: [l.jsx("p", { children: "\u91CD\u7ED1\u3001\u5220\u9664\u4ECD\u7136\u5C5E\u4E8E\u9AD8\u98CE\u9669\u52A8\u4F5C\uFF0C\u5148\u7EE7\u7EED\u7981\u7528\u3002\u542F\u7528/\u505C\u7528\u73B0\u5728\u5148\u8D70\u786E\u8BA4\u6D41\u7A0B\uFF0C\u907F\u514D\u8BEF\u64CD\u4F5C\u3002" }), l.jsxs(Yn, { children: [l.jsx("button", { type: "button", onClick: () => e.onOpenAdminReadOnlyPage("users", { search: s.user.username || "" }), children: "\u67E5\u770B\u7528\u6237" }), l.jsx("button", { type: "button", onClick: () => e.onOpenAdminReadOnlyPage("upstreams", { country: s.currentCountry ?? s.targetCountry ?? null, search: s.lockedUpstream ? String(s.lockedUpstream.id) : s.currentIp || "" }), children: "\u67E5\u770B\u4E0A\u6E38" }), l.jsx("button", { type: "button", onClick: () => e.onOpenAdminReadOnlyPage("logs", { search: s.currentIp || String(s.currentUpstreamId ?? s.id ?? "") }), children: "\u67E5\u770B\u65E5\u5FD7" }), l.jsx("button", { type: "button", onClick: () => {
    var f;
    n({ activeConnections: s.activeConnections, currentIp: s.currentIp ?? null, currentStatus: s.status, entryId: s.id, lockedUpstreamId: ((f = s.lockedUpstream) == null ? void 0 : f.id) ?? null, status: i, targetCity: s.targetCity ?? null, targetCountry: s.targetCountry ?? "", targetRegion: s.targetRegion ?? null, username: s.username }), a(null);
  }, children: o }), l.jsx(et, { label: "\u91CD\u7ED1" }), l.jsx("button", { type: "button", onClick: () => {
    window.confirm("\u786E\u5B9A\u6C38\u4E45\u5220\u9664\u4EE3\u7406\u201C" + s.username + "\u201D\uFF1F\u7ED1\u5B9A\u7684\u4E0A\u6E38\u4F1A\u91CA\u653E\u56DE\u53EF\u7528\u6C60\uFF0C\u6D41\u91CF\u8BB0\u5F55\u4E00\u5E76\u5220\u9664\uFF0C\u4E0D\u53EF\u6062\u590D\u3002") && e.onDeleteProxyEntry(s.id);
  }, children: "\u5220\u9664" })] })] })] }) : l.jsx(H, { title: "\u4EE3\u7406\u8BE6\u60C5", children: l.jsx(Pt, { text: "\u5F53\u524D\u5217\u8868\u5DF2\u53D8\u5316\uFF0C\u4F46\u8FD9\u6B21\u786E\u8BA4\u4ECD\u7136\u9501\u5B9A\u5728\u4F60\u521A\u624D\u6253\u5F00\u7684\u90A3\u6761\u4EE3\u7406\u3002" }) }), t && l.jsx(xr, { title: t.status === "disabled" ? "\u786E\u8BA4\u505C\u7528\u4EE3\u7406" : "\u786E\u8BA4\u542F\u7528\u4EE3\u7406", onClose: () => {
    n(null), a(null);
  }, children: l.jsxs("div", { className: "modal-form", children: [l.jsxs("div", { className: "section-heading", children: [l.jsx("h2", { children: t.username }), l.jsx("span", { children: pe(t.targetCountry, t.targetRegion, t.targetCity) })] }), l.jsx("div", { className: "hint-list", children: t.status === "disabled" ? l.jsxs(l.Fragment, { children: [l.jsx("span", { children: "\u505C\u7528\u540E\uFF0C\u8FD9\u6761\u4EE3\u7406\u4F1A\u505C\u6B62\u4F7F\u7528\u5F53\u524D\u4E0A\u6E38\u3002" }), l.jsx("span", { children: "\u5982\u679C\u5F53\u524D\u6709\u7ED1\u5B9A\uFF0C\u4E0A\u6E38\u4F1A\u6309\u7CFB\u7EDF\u89C4\u5219\u91CA\u653E\u3002" }), t.activeConnections > 0 && l.jsxs("span", { children: ["\u5F53\u524D\u8FD8\u6709 ", t.activeConnections, " \u4E2A\u6D3B\u8DC3\u8FDE\u63A5\uFF0C\u7ACB\u523B\u505C\u7528\u53EF\u80FD\u4F1A\u5F71\u54CD\u6B63\u5728\u4F7F\u7528\u8FD9\u6761\u4EE3\u7406\u7684\u4EBA\u3002"] }), l.jsx("span", { children: "\u672C\u6B21\u64CD\u4F5C\u4F1A\u5199\u5165\u7BA1\u7406\u5458\u64CD\u4F5C\u65E5\u5FD7\u3002" })] }) : l.jsxs(l.Fragment, { children: [t.currentStatus === "dead" && l.jsx("span", { children: "\u8FD9\u6761\u4EE3\u7406\u5F53\u524D\u5904\u4E8E\u5931\u6548\u72B6\u6001\uFF0C\u672C\u6B21\u542F\u7528\u4F1A\u5C1D\u8BD5\u628A\u5B83\u6062\u590D\u5230\u53EF\u7528\u72B6\u6001\u3002" }), l.jsx("span", { children: "\u542F\u7528\u540E\uFF0C\u7CFB\u7EDF\u4F1A\u6309\u76EE\u6807\u5730\u533A\u81EA\u52A8\u5C1D\u8BD5\u91CD\u65B0\u5339\u914D\u4E00\u4E2A\u53EF\u7528\u4E0A\u6E38\u3002" }), l.jsx("span", { children: "\u5982\u679C\u5F53\u524D\u6CA1\u6709\u53EF\u7528\u4E14\u5DF2\u626B\u63CF\u7684\u4E0A\u6E38\uFF0C\u542F\u7528\u4F1A\u5B89\u5168\u5931\u8D25\uFF0C\u4E0D\u4F1A\u5077\u5077\u6539\u6210\u522B\u7684\u7ED3\u679C\u3002" }), l.jsx("span", { children: "\u672C\u6B21\u64CD\u4F5C\u4F1A\u5199\u5165\u7BA1\u7406\u5458\u64CD\u4F5C\u65E5\u5FD7\u3002" })] }) }), l.jsxs("div", { className: "detail-grid", children: [l.jsx(B, { label: "\u5F53\u524D\u72B6\u6001", value: Lt(t.currentStatus) }), l.jsx(B, { label: "\u5F53\u524D\u4E0A\u6E38", value: t.lockedUpstreamId ? `#${t.lockedUpstreamId}` : "\u65E0" }), l.jsx(B, { label: "\u5F53\u524D\u51FA\u53E3 IP", value: t.currentIp || "\u672A\u7ED1\u5B9A" }), l.jsx(B, { label: "\u6D3B\u8DC3\u8FDE\u63A5", value: String(t.activeConnections) })] }), r && l.jsx("p", { className: "empty-state", children: r }), l.jsxs("div", { className: "modal-actions", children: [l.jsx("button", { type: "button", onClick: () => {
    n(null), a(null);
  }, disabled: e.isSaving, children: "\u53D6\u6D88" }), l.jsx("button", { className: "primary-button", type: "button", onClick: () => void u(), disabled: e.isSaving, children: t.status === "disabled" ? "\u786E\u8BA4\u505C\u7528\uFF0C\u5E76\u91CA\u653E\u5F53\u524D\u7ED1\u5B9A" : "\u786E\u8BA4\u542F\u7528\uFF0C\u5E76\u5C1D\u8BD5\u91CD\u65B0\u5339\u914D" })] })] }) })] });
}
function ch(e) {
  const t = e.upstreams.flatMap((c) => c.scanLogs.map((d) => ({ ...d, host: c.host, upstreamId: c.id }))), [n, r] = C.useState(""), [a, s] = C.useState("all"), [i, o] = C.useState(""), [u, f] = C.useState("all"), v = e.operationLogs.filter((c) => {
    var d;
    const h = n.trim().toLowerCase(), b = Uo(c).toLowerCase(), S = !h || c.action.toLowerCase().includes(h) || c.targetType.toLowerCase().includes(h) || c.targetId.toLowerCase().includes(h) || (((d = c.actor) == null ? void 0 : d.username) || "").toLowerCase().includes(h) || b.includes(h), N = a === "all" || c.action === a;
    return S && N;
  }), p = t.filter((c) => {
    const d = i.trim().toLowerCase(), h = !d || String(c.upstreamId).toLowerCase().includes(d) || c.host.toLowerCase().includes(d) || (c.exitIp || "").toLowerCase().includes(d) || pe(c.country, c.region, c.city).toLowerCase().includes(d) || (c.message || "").toLowerCase().includes(d) || (c.errorType || "").toLowerCase().includes(d), b = u === "all" || u === "success" && c.success || u === "failed" && !c.success;
    return h && b;
  }), g = [...new Set(e.operationLogs.map((c) => c.action))].sort(), m = Tt(p, 10), x = Tt(v, 10), y = !!n.trim() || a !== "all", L = !!i.trim() || u !== "all";
  return C.useEffect(() => {
    e.readOnlyIntent && (e.readOnlyIntent.search && (r(e.readOnlyIntent.search), o(e.readOnlyIntent.search)), s("all"), f("all"), e.setReadOnlyIntent(null));
  }, [e.readOnlyIntent, e.setReadOnlyIntent]), l.jsxs(l.Fragment, { children: [l.jsxs("section", { className: "metric-grid compact", children: [l.jsx(M, { label: "\u65E5\u5FD7\u603B\u6570", value: String(t.length + e.operationLogs.length) }), l.jsx(M, { label: "\u64CD\u4F5C\u65E5\u5FD7", value: String(v.length) }), l.jsx(M, { label: "\u6210\u529F", value: String(t.filter((c) => c.success).length) }), l.jsx(M, { label: "\u5931\u8D25", value: String(t.filter((c) => !c.success).length), tone: t.some((c) => !c.success) ? "warn" : void 0 }), l.jsx(M, { label: "\u7C7B\u578B", value: "operation + scan" }), l.jsx(M, { label: "\u654F\u611F\u4FE1\u606F", value: "\u5DF2\u9690\u85CF" })] }), l.jsx("section", { className: "action-strip", children: l.jsxs("div", { children: [l.jsx("h2", { children: "\u65E5\u5FD7\u5BA1\u8BA1\u5DE5\u4F5C\u533A" }), l.jsx("p", { children: "\u5C55\u793A\u7BA1\u7406\u5458\u64CD\u4F5C\u548C\u4E0A\u6E38\u626B\u63CF\u65E5\u5FD7\u3002\u5BC6\u7801\u3001\u5BC6\u94A5\u7B49\u654F\u611F\u5185\u5BB9\u4E0D\u4F1A\u5728\u8FD9\u91CC\u663E\u793A\u3002" })] }) }), l.jsxs(H, { title: "\u7BA1\u7406\u5458\u64CD\u4F5C\u65E5\u5FD7", count: v.length, children: [l.jsx("div", { className: "hint-list", children: l.jsx("span", { children: "\u641C\u7D22\u53EF\u4EE5\u8F93\u5165\u7BA1\u7406\u5458\u3001\u52A8\u4F5C\u3001\u5BF9\u8C61\u6216\u6458\u8981\uFF1B\u52A8\u4F5C\u7B5B\u9009\u53EF\u4EE5\u53EA\u770B\u67D0\u4E00\u7C7B\u64CD\u4F5C\u3002" }) }), l.jsxs("div", { className: "table-tools", children: [l.jsxs("label", { children: ["\u641C\u7D22", l.jsx("input", { value: n, onChange: (c) => r(c.target.value), placeholder: "\u7BA1\u7406\u5458\u3001\u52A8\u4F5C\u3001\u5BF9\u8C61\u3001\u6458\u8981" })] }), l.jsxs("label", { children: ["\u52A8\u4F5C", l.jsxs("select", { value: a, onChange: (c) => s(c.target.value), children: [l.jsx("option", { value: "all", children: "\u5168\u90E8\u52A8\u4F5C" }), g.map((c) => l.jsx("option", { value: c, children: za(c) }, c))] })] }), y && l.jsx("button", { type: "button", onClick: () => {
    r(""), s("all");
  }, children: "\u91CD\u7F6E\u7B5B\u9009" })] }), l.jsx(Et, { items: [{ label: "\u641C\u7D22", value: n.trim() || null, onClear: n.trim() ? () => r("") : null }, { label: "\u52A8\u4F5C", value: a === "all" ? null : za(a), onClear: a === "all" ? null : () => s("all") }] }), l.jsx(Nt, { shown: v.length, total: e.operationLogs.length }), l.jsxs(St, { minWidth: 860, maxHeight: 360, children: [l.jsx("thead", { children: l.jsxs("tr", { children: [l.jsx("th", { children: "\u65F6\u95F4" }), l.jsx("th", { children: "\u7BA1\u7406\u5458" }), l.jsx("th", { children: "\u52A8\u4F5C" }), l.jsx("th", { children: "\u5BF9\u8C61" }), l.jsx("th", { children: "\u6458\u8981" })] }) }), l.jsx("tbody", { children: x.rows.map((c) => {
    var d;
    return l.jsxs("tr", { children: [l.jsx("td", { children: It(c.createdAt) }), l.jsx("td", { children: ((d = c.actor) == null ? void 0 : d.username) || `#${c.actorUserId ?? "-"}` }), l.jsx("td", { children: za(c.action) }), l.jsxs("td", { children: [c.targetType, " #", c.targetId] }), l.jsx("td", { children: Uo(c) })] }, c.id);
  }) })] }), l.jsx(Ct, { page: x.page, totalPages: x.totalPages, onPageChange: x.setPage }), l.jsx(_t, { emptyText: "\u6682\u65E0\u7BA1\u7406\u5458\u64CD\u4F5C\u65E5\u5FD7\u3002", filteredText: "\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u7BA1\u7406\u5458\u64CD\u4F5C\u65E5\u5FD7", shown: v.length, total: e.operationLogs.length })] }), l.jsxs(H, { title: "\u626B\u63CF\u65E5\u5FD7", count: p.length, children: [l.jsx("div", { className: "hint-list", children: l.jsx("span", { children: "\u53EF\u4EE5\u6309\u4E0A\u6E38\u7F16\u53F7\u3001\u4E3B\u673A\u3001\u51FA\u53E3 IP \u6216\u9519\u8BEF\u4FE1\u606F\u641C\u7D22\uFF0C\u518D\u6309\u7ED3\u679C\u7B5B\u9009\u3002" }) }), l.jsxs("div", { className: "table-tools compact-tools", children: [l.jsxs("label", { children: ["\u641C\u7D22", l.jsx("input", { value: i, onChange: (c) => o(c.target.value), placeholder: "\u4E0A\u6E38\u7F16\u53F7\u3001\u4E3B\u673A\u3001\u51FA\u53E3 IP\u3001\u9519\u8BEF\u4FE1\u606F" })] }), l.jsxs("label", { children: ["\u7ED3\u679C", l.jsxs("select", { value: u, onChange: (c) => f(c.target.value), children: [l.jsx("option", { value: "all", children: "\u5168\u90E8\u7ED3\u679C" }), l.jsx("option", { value: "success", children: "\u6210\u529F" }), l.jsx("option", { value: "failed", children: "\u5931\u8D25" })] })] }), L && l.jsx("button", { type: "button", onClick: () => {
    o(""), f("all");
  }, children: "\u91CD\u7F6E\u7B5B\u9009" })] }), l.jsx(Et, { items: [{ label: "\u641C\u7D22", value: i.trim() || null, onClear: i.trim() ? () => o("") : null }, { label: "\u7ED3\u679C", value: u === "all" ? null : Lt(u), onClear: u === "all" ? null : () => f("all") }] }), l.jsx(Nt, { shown: p.length, total: t.length }), l.jsxs(St, { minWidth: 820, maxHeight: 560, children: [l.jsx("thead", { children: l.jsxs("tr", { children: [l.jsx("th", { children: "\u65F6\u95F4" }), l.jsx("th", { children: "\u7C7B\u578B" }), l.jsx("th", { children: "\u5BF9\u8C61" }), l.jsx("th", { children: "\u7ED3\u679C" }), l.jsx("th", { children: "\u51FA\u53E3 IP" }), l.jsx("th", { children: "\u6D88\u606F" })] }) }), l.jsx("tbody", { children: m.rows.map((c) => l.jsxs("tr", { children: [l.jsx("td", { children: It(c.createdAt) }), l.jsx("td", { children: "scan_logs" }), l.jsxs("td", { children: ["#", c.upstreamId, " ", c.host] }), l.jsx("td", { children: l.jsx(dt, { status: c.success ? "success" : "failed" }) }), l.jsx("td", { children: c.exitIp || "\u65E0" }), l.jsx("td", { children: c.message || c.errorType || "\u65E0" })] }, `${c.upstreamId}-${c.id}`)) })] }), l.jsx(Ct, { page: m.page, totalPages: m.totalPages, onPageChange: m.setPage }), l.jsx(_t, { emptyText: "\u6682\u65E0\u626B\u63CF\u65E5\u5FD7\u3002", filteredText: "\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u626B\u63CF\u65E5\u5FD7", shown: p.length, total: t.length })] })] });
}
function dh(e) {
  const t = `${Mn}:\u7528\u6237\u540D:\u5BC6\u7801`, n = wi(t), r = e.systemConfig;
  return l.jsxs(l.Fragment, { children: [l.jsx("section", { className: "action-strip", children: l.jsxs("div", { children: [l.jsx("h2", { children: "\u7CFB\u7EDF\u8BBE\u7F6E" }), l.jsx("p", { children: "\u7B2C\u4E00\u7248\u53EA\u8BFB\u5C55\u793A\u5173\u952E\u53C2\u6570\uFF0C\u907F\u514D\u5728\u6CA1\u6709\u6743\u9650\u3001\u65E5\u5FD7\u548C\u56DE\u6EDA\u89C4\u5219\u524D\u8BEF\u6539\u7CFB\u7EDF\u914D\u7F6E\u3002" })] }) }), l.jsx(H, { title: "\u57FA\u7840\u8BBE\u7F6E", children: l.jsxs("div", { className: "setting-grid", children: [l.jsx(pt, { label: "\u7F51\u5173\u7AEF\u53E3", value: String((r == null ? void 0 : r.gatewayPort) ?? 18001) }), l.jsx(pt, { label: "\u652F\u6301\u56FD\u5BB6", value: (r == null ? void 0 : r.supportedCountries.join(", ")) || "US, GB, FR, CA, AU" }), l.jsx(pt, { label: "\u626B\u63CF\u95F4\u9694", value: r ? Ra(r.scanIntervalMs) : "\u8BFB\u53D6\u4E2D" }), l.jsx(pt, { label: "\u626B\u63CF\u5E76\u53D1", value: r ? String(r.scanConcurrency) : "\u8BFB\u53D6\u4E2D" }), l.jsx(pt, { label: "\u626B\u63CF\u6279\u6B21", value: r ? String(r.scanBatchSize) : "\u8BFB\u53D6\u4E2D" }), l.jsx(pt, { label: "\u8D85\u65F6\u65F6\u95F4", value: r ? Ra(r.scanTimeoutMs) : "\u8BFB\u53D6\u4E2D" }), l.jsx(pt, { label: "\u5730\u7406\u7F13\u5B58", value: r ? Ra(r.geoCacheTtlMs) : "\u8BFB\u53D6\u4E2D" }), l.jsx(pt, { label: "\u5FAA\u73AF\u626B\u63CF", value: r ? r.workerRepeat ? "\u5DF2\u5F00\u542F" : "\u5355\u6B21\u6267\u884C" : "\u8BFB\u53D6\u4E2D" }), l.jsx(pt, { label: "\u5907\u4EFD\u72B6\u6001", value: (r == null ? void 0 : r.backupStatus) ?? "\u8BFB\u53D6\u4E2D" })] }) }), l.jsxs(H, { title: "\u8FDE\u63A5\u4FE1\u606F", children: [l.jsx(ji, { passwordText: "\u7528\u6237\u81EA\u5DF1\u7684\u4EE3\u7406\u5BC6\u7801\u53EA\u5728\u751F\u6210\u4EE3\u7406\u65F6\u663E\u793A\u4E00\u6B21\uFF0C\u540E\u53F0\u4E0D\u4F1A\u957F\u671F\u4FDD\u5B58\u660E\u6587\u3002" }), l.jsxs("div", { className: "copy-list", children: [l.jsxs("div", { className: "copy-row", children: [l.jsx("code", { children: Mn }), l.jsx("button", { type: "button", onClick: () => e.copyText(Mn, "\u5DF2\u590D\u5236\u7F51\u5173\u5730\u5740\u6A21\u677F\uFF0C\u8BF7\u6309\u683C\u5F0F\u586B\u5199\u7528\u6237\u540D\u548C\u5BC6\u7801\u3002"), children: "\u590D\u5236\u7F51\u5173\u5730\u5740" })] }), l.jsxs("div", { className: "copy-row", children: [l.jsxs("div", { className: "copy-content", children: [l.jsx("code", { children: t }), n && l.jsxs("div", { className: "copy-meta", children: [l.jsxs("span", { children: [l.jsx("strong", { children: "\u4E3B\u673A" }), l.jsx("code", { children: n.host })] }), l.jsxs("span", { children: [l.jsx("strong", { children: "\u7AEF\u53E3" }), l.jsx("code", { children: n.port })] }), l.jsxs("span", { children: [l.jsx("strong", { children: "\u7528\u6237\u540D" }), l.jsx("code", { children: n.username })] }), l.jsxs("span", { children: [l.jsx("strong", { children: "\u5BC6\u7801" }), l.jsx("code", { children: n.password })] })] })] }), l.jsx("button", { type: "button", onClick: () => e.copyText(t, "\u5DF2\u590D\u5236\u4EE3\u7406\u683C\u5F0F\u6A21\u677F\uFF0C\u8BF7\u6309\u6B64\u683C\u5F0F\u586B\u5199\u3002"), children: "\u590D\u5236\u4EE3\u7406\u683C\u5F0F" })] })] })] })] });
}
function fh(e) {
  var t, n;
  return l.jsxs("section", { className: "workspace", children: [l.jsxs(Jc, { label: "\u7528\u6237\u9762\u677F\u5BFC\u822A", children: [l.jsxs("div", { className: "nav-select", children: [l.jsx("span", { children: "\u5F53\u524D\u7528\u6237" }), l.jsx("strong", { children: ((t = e.selectedUser) == null ? void 0 : t.username) || "\u672A\u767B\u5F55\u7528\u6237" })] }), l.jsx(Je, { active: e.activePage === "home", onClick: () => e.setActivePage("home"), children: "\u6211\u7684\u6982\u89C8" }), l.jsx(Je, { active: e.activePage === "generate", onClick: () => e.setActivePage("generate"), children: "\u751F\u6210\u4EE3\u7406" }), l.jsx(Je, { active: e.activePage === "traffic", onClick: () => e.setActivePage("traffic"), children: "\u6D41\u91CF\u8BB0\u5F55" })] }), l.jsx("section", { className: "content", children: e.selectedUser ? l.jsxs(l.Fragment, { children: [e.activePage === "home" && l.jsx(ph, { user: e.selectedUser, entries: e.entries, trafficRows: e.trafficRows }), e.activePage === "generate" && l.jsx(hh, { allowedCountries: (n = e.selectedUser) != null && n.allowedCountries && e.selectedUser.allowedCountries.length > 0 ? Pe.filter((r) => {
    var a, s;
    return (s = (a = e.selectedUser) == null ? void 0 : a.allowedCountries) == null ? void 0 : s.includes(r.value);
  }) : Pe, copies: e.createdCopies, copyText: e.copyText, createEntries: e.createEntries, form: { ...e.form, userId: e.selectedUser.id.toString() }, isSaving: e.isSaving, setForm: e.setForm }), e.activePage === "traffic" && l.jsx(vh, { entries: e.entries, rows: e.trafficRows })] }) : l.jsx(Pt, { text: "\u6682\u65E0\u53EF\u67E5\u770B\u7528\u6237\u3002" }) })] });
}
function ph(e) {
  const t = Number(e.user.trafficQuotaBytes), n = Number(e.user.trafficUsedBytes), r = t > 0 ? Math.max(0, t - n) : 0, a = xt(e.trafficRows.filter((o) => Hl(o.date)).map((o) => o.totalBytes)), s = xt(e.trafficRows.filter((o) => Wl(o.date)).map((o) => o.totalBytes)), i = ki(n, t), c = e.entries.filter((o) => o.status === "active").length;
  return l.jsxs("div", { className: "user-dashboard", children: [l.jsxs("section", { className: "dash-hero", children: [l.jsxs("article", { className: "dash-stat dash-stat-primary", children: [l.jsx("span", { children: "\u5269\u4F59\u989D\u5EA6" }), l.jsx("strong", { children: t > 0 ? re(String(r)) : "\u4E0D\u9650" }), l.jsx("em", { children: t > 0 ? `\u5DF2\u7528 ${i}%` : "\u65E0\u4E0A\u9650" })] }), l.jsxs("article", { className: "dash-stat", children: [l.jsx("span", { children: "\u4ECA\u65E5\u6D41\u91CF" }), l.jsx("strong", { children: re(String(a)) })] }), l.jsxs("article", { className: "dash-stat", children: [l.jsx("span", { children: "\u672C\u6708\u6D41\u91CF" }), l.jsx("strong", { children: re(String(s)) })] }), l.jsxs("article", { className: "dash-stat", children: [l.jsx("span", { children: "\u4EE3\u7406\u69FD\u4F4D" }), l.jsx("strong", { children: `${e.entries.length}/${e.user.maxProxyEntries > 0 ? e.user.maxProxyEntries : "\u4E0D\u9650"}` }), l.jsx("em", { children: `\u542F\u7528 ${c}` })] })] }), l.jsxs("section", { className: "dash-grid", children: [l.jsxs("div", { className: "dash-panel", children: [l.jsx("h3", { children: "\u6D41\u91CF\u76D1\u63A7" }), l.jsxs("div", { className: "dash-meter", children: [l.jsxs("div", { className: "dash-meter-head", children: [l.jsx("span", { children: re(e.user.trafficUsedBytes) }), l.jsx("span", { children: td(e.user.trafficQuotaBytes) })] }), l.jsx("div", { className: "dash-meter-track", children: l.jsx("span", { className: i >= 85 ? "warn" : "", style: { width: `${Math.min(100, i)}%` } }) }), l.jsxs("div", { className: "dash-meter-meta", children: [l.jsxs("span", { children: ["\u4ECA\u65E5 ", re(String(a))] }), l.jsxs("span", { children: ["\u672C\u6708 ", re(String(s))] })] })] }), t > 0 && i >= 85 && l.jsx("div", { className: "dash-alert", children: i >= 100 ? "\u989D\u5EA6\u5DF2\u7528\u5B8C\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458\u5904\u7406\u3002" : `\u989D\u5EA6\u5DF2\u4F7F\u7528 ${i}%\uFF0C\u5EFA\u8BAE\u63D0\u524D\u8054\u7CFB\u7BA1\u7406\u5458\u3002` })] }), l.jsxs("div", { className: "dash-panel", children: [l.jsx("h3", { children: "\u8D26\u6237\u6982\u89C8" }), l.jsxs("div", { className: "dash-kv-grid", children: [l.jsxs("div", { children: [l.jsx("span", { children: "\u7528\u6237\u540D" }), l.jsx("strong", { children: e.user.username })] }), l.jsxs("div", { children: [l.jsx("span", { children: "\u5E76\u53D1\u4E0A\u9650" }), l.jsx("strong", { children: String(e.user.maxConcurrentConnections) })] }), l.jsxs("div", { children: [l.jsx("span", { children: "\u4EE3\u7406\u6570\u91CF" }), l.jsx("strong", { children: `${e.entries.length} / ${e.user.maxProxyEntries}` })] }), l.jsxs("div", { children: [l.jsx("span", { children: "\u542F\u7528\u4EE3\u7406" }), l.jsx("strong", { children: String(c) })] }), l.jsxs("div", { children: [l.jsx("span", { children: "\u7F51\u5173\u5730\u5740" }), l.jsx("strong", { children: Mn })] }), l.jsxs("div", { children: [l.jsx("span", { children: "\u6D41\u91CF\u8BB0\u5F55" }), l.jsx("strong", { children: `${e.trafficRows.length} \u6761` })] })] })] })] })] });
}
function hh(e) {
  return C.useEffect(() => {
    e.allowedCountries.length !== 0 && (e.allowedCountries.some((t) => t.value === e.form.targetCountry) || e.setForm({ ...e.form, targetCountry: e.allowedCountries[0].value }));
  }, [e.allowedCountries, e.form, e.setForm]), l.jsxs("form", { className: "form-surface", onSubmit: e.createEntries, children: [l.jsxs("div", { className: "section-heading", children: [l.jsx("h2", { children: "\u751F\u6210\u4EE3\u7406" }), l.jsx("span", { children: Mn })] }), l.jsx("div", { className: "hint-list", children: l.jsx("span", { children: "\u56FD\u5BB6\u5FC5\u9009\uFF0C\u5DDE/\u57CE\u5E02\u53EF\u7559\u7A7A\u3002\u751F\u6210\u540E\u5728\u4E0B\u65B9\u9010\u884C\u663E\u793A\uFF0C\u53EF\u76F4\u63A5\u9009\u4E2D\u590D\u5236\u3002" }) }), l.jsxs("div", { className: "form-grid four", children: [l.jsxs("label", { children: ["\u56FD\u5BB6", l.jsx("select", { value: e.form.targetCountry, onChange: (t) => e.setForm({ ...e.form, targetCountry: t.target.value }), children: e.allowedCountries.map((t) => l.jsx("option", { value: t.value, children: t.label }, t.value)) })] }), l.jsxs("label", { children: ["\u5DDE/\u5730\u533A", l.jsx("input", { value: e.form.targetRegion, onChange: (t) => e.setForm({ ...e.form, targetRegion: t.target.value }), placeholder: "\u53EF\u4E0D\u586B" })] }), l.jsxs("label", { children: ["\u57CE\u5E02", l.jsx("input", { value: e.form.targetCity, onChange: (t) => e.setForm({ ...e.form, targetCity: t.target.value }), placeholder: "\u53EF\u4E0D\u586B" })] }), l.jsxs("label", { children: ["\u6570\u91CF", l.jsx("input", { min: "1", max: "20", type: "number", value: e.form.count, onChange: (t) => e.setForm({ ...e.form, count: t.target.value }) })] })] }), l.jsx("button", { className: "primary-button", type: "submit", disabled: e.isSaving || !e.form.userId, children: "\u751F\u6210\u4EE3\u7406" }), l.jsx("textarea", { className: "proxy-notepad", readOnly: true, value: e.copies.join("\n"), placeholder: "\u751F\u6210\u540E\u4EE3\u7406\u4F1A\u9010\u884C\u663E\u793A\u5728\u6B64\uFF0C\u683C\u5F0F\uFF1A\u4E3B\u673A:\u7AEF\u53E3:\u7528\u6237\u540D:\u5BC6\u7801", spellCheck: false })] });
}
function mh(e) {
  return C.useEffect(() => {
    e.allowedCountries.length !== 0 && (e.allowedCountries.some((t) => t.value === e.form.targetCountry) || e.setForm({ ...e.form, targetCountry: e.allowedCountries[0].value }));
  }, [e.allowedCountries, e.form, e.setForm]), l.jsxs(l.Fragment, { children: [l.jsxs("div", { className: "hint-list", children: [l.jsx("span", { children: "\u521B\u5EFA\u540E\u4F1A\u7ACB\u5373\u7ED1\u5B9A\u53EF\u7528\u4E0A\u6E38\uFF0C\u5E76\u53EA\u663E\u793A\u8FD9\u4E00\u56DE\u4EE3\u7406\u5BC6\u7801\u3002" }), l.jsx("span", { children: "\u56FD\u5BB6\u662F\u5FC5\u586B\u9879\uFF0C\u5DDE/\u5730\u533A\u548C\u57CE\u5E02\u53EF\u4EE5\u7559\u7A7A\uFF1B\u7559\u7A7A\u5C31\u6309\u66F4\u5927\u8303\u56F4\u627E\u53EF\u7528\u8D44\u6E90\u3002" })] }), l.jsxs("div", { className: "form-grid four", children: [l.jsxs("label", { children: ["\u56FD\u5BB6", l.jsx("select", { value: e.form.targetCountry, onChange: (t) => e.setForm({ ...e.form, targetCountry: t.target.value }), children: e.allowedCountries.map((t) => l.jsx("option", { value: t.value, children: t.label }, t.value)) })] }), l.jsxs("label", { children: ["\u5DDE / \u5730\u533A", l.jsx("span", { className: "field-note", children: "\u53EF\u4E0D\u586B\uFF0C\u7559\u7A7A\u8868\u793A\u4E0D\u9650\u5DDE / \u5730\u533A\u3002" }), l.jsx("input", { value: e.form.targetRegion, onChange: (t) => e.setForm({ ...e.form, targetRegion: t.target.value }), placeholder: "\u53EF\u4E0D\u586B" })] }), l.jsxs("label", { children: ["\u57CE\u5E02", l.jsx("span", { className: "field-note", children: "\u53EF\u4E0D\u586B\uFF0C\u7559\u7A7A\u8868\u793A\u4E0D\u9650\u57CE\u5E02\u3002" }), l.jsx("input", { value: e.form.targetCity, onChange: (t) => e.setForm({ ...e.form, targetCity: t.target.value }), placeholder: "\u53EF\u4E0D\u586B" })] }), l.jsxs("label", { children: ["\u6570\u91CF", l.jsx("span", { className: "field-note", children: "\u901A\u5E38\u586B 1\uFF1B\u5982\u679C\u60F3\u4E00\u6B21\u521B\u5EFA\u591A\u6761\uFF0C\u53EF\u4EE5\u586B\u66F4\u5927\u7684\u6570\u5B57\u3002" }), l.jsx("input", { min: "1", max: "20", type: "number", value: e.form.count, onChange: (t) => e.setForm({ ...e.form, count: t.target.value }) })] })] }), l.jsx("button", { className: "primary-button", type: "submit", disabled: e.isSaving || !e.form.userId, children: "\u521B\u5EFA\u4EE3\u7406" })] });
}
function gh(e) {
  const [t, n] = C.useState(""), [r, a] = C.useState("all"), [s, i] = C.useState("all"), o = !!t.trim() || r !== "all" || s !== "all", u = [...new Set(e.entries.map((p) => p.targetCountry).filter(Boolean))].sort(), f = e.entries.filter((p) => {
    const g = t.trim().toLowerCase(), m = !g || p.username.toLowerCase().includes(g) || String(p.id).includes(g) || (p.currentIp || "").toLowerCase().includes(g) || pe(p.targetCountry, p.targetRegion, p.targetCity).toLowerCase().includes(g), x = r === "all" || p.status === r, y = s === "all" || p.targetCountry === s;
    return m && x && y;
  }), v = Tt(f, 10);
  return l.jsxs(H, { title: "\u6211\u7684\u4EE3\u7406", count: f.length, children: [l.jsx("div", { className: "hint-list", children: l.jsx("span", { children: "\u5BC6\u7801\u53EA\u5728\u751F\u6210\u65F6\u663E\u793A\u4E00\u6B21\u3002\u53EF\u6309\u8D26\u53F7\u3001\u51FA\u53E3 IP \u6216\u5730\u533A\u641C\u7D22\u3002" }) }), l.jsxs("div", { className: "table-tools", children: [l.jsxs("label", { children: ["\u641C\u7D22", l.jsx("input", { value: t, onChange: (p) => n(p.target.value), placeholder: "\u4EE3\u7406\u8D26\u53F7\u3001\u51FA\u53E3 IP\u3001\u5730\u533A" })] }), l.jsxs("label", { children: ["\u72B6\u6001", l.jsxs("select", { value: r, onChange: (p) => a(p.target.value), children: [l.jsx("option", { value: "all", children: "\u5168\u90E8\u72B6\u6001" }), l.jsx("option", { value: "active", children: "\u542F\u7528" }), l.jsx("option", { value: "disabled", children: "\u505C\u7528" }), l.jsx("option", { value: "dead", children: "\u5931\u6548" })] })] }), l.jsxs("label", { children: ["\u56FD\u5BB6", l.jsxs("select", { value: s, onChange: (p) => i(p.target.value), children: [l.jsx("option", { value: "all", children: "\u5168\u90E8\u56FD\u5BB6" }), u.map((p) => l.jsx("option", { value: p, children: p.toUpperCase() }, p))] })] }), o && l.jsx("button", { type: "button", onClick: () => {
    n(""), a("all"), i("all");
  }, children: "\u91CD\u7F6E\u7B5B\u9009" })] }), l.jsx(Et, { items: [{ label: "\u641C\u7D22", value: t.trim() || null, onClear: t.trim() ? () => n("") : null }, { label: "\u72B6\u6001", value: r === "all" ? null : Lt(r), onClear: r === "all" ? null : () => a("all") }, { label: "\u56FD\u5BB6", value: s === "all" ? null : s.toUpperCase(), onClear: s === "all" ? null : () => i("all") }] }), l.jsx(Nt, { shown: f.length, total: e.entries.length }), l.jsxs(St, { minWidth: 1080, children: [l.jsx("thead", { children: l.jsxs("tr", { children: [l.jsx("th", { children: "\u4EE3\u7406\u8D26\u53F7" }), l.jsx("th", { children: "\u683C\u5F0F\u8BF4\u660E" }), l.jsx("th", { children: "\u76EE\u6807\u5730\u533A" }), l.jsx("th", { children: "\u5F53\u524D\u51FA\u53E3 IP" }), l.jsx("th", { children: "\u5F53\u524D\u5730\u533A" }), l.jsx("th", { children: "\u72B6\u6001" }), l.jsx("th", { children: "\u5DF2\u7528\u6D41\u91CF" }), l.jsx("th", { children: "\u8FDE\u63A5" }), l.jsx("th", { children: "\u521B\u5EFA\u65F6\u95F4" }), l.jsx("th", { children: "\u6700\u540E\u4F7F\u7528" }), l.jsx("th", { children: "\u64CD\u4F5C" })] }) }), l.jsx("tbody", { children: v.rows.map((p) => l.jsxs("tr", { children: [l.jsx("td", { children: l.jsx("strong", { children: p.username }) }), l.jsx("td", { children: l.jsxs("code", { children: [Mn, ":", p.username, ":\u5BC6\u7801\u53EA\u5728\u521B\u5EFA\u65F6\u663E\u793A"] }) }), l.jsx("td", { children: pe(p.targetCountry, p.targetRegion, p.targetCity) }), l.jsx("td", { children: p.currentIp || "\u672A\u7ED1\u5B9A" }), l.jsx("td", { children: pe(p.currentCountry, p.currentRegion, p.currentCity) }), l.jsx("td", { children: l.jsx(dt, { status: p.status }) }), l.jsx("td", { children: re(p.trafficUsedBytes) }), l.jsx("td", { children: p.activeConnections }), l.jsx("td", { children: It(p.createdAt) }), l.jsx("td", { children: It(p.lastUsedAt) }), l.jsx("td", { children: l.jsxs(Yn, { children: [l.jsx("button", { type: "button", onClick: () => e.copyText(`${Mn}:${p.username}:\u5BC6\u7801\u53EA\u5728\u521B\u5EFA\u65F6\u663E\u793A`, "\u5DF2\u590D\u5236\u683C\u5F0F\u8BF4\u660E\uFF0C\u4E0D\u542B\u771F\u5B9E\u5BC6\u7801\u3002"), children: "\u590D\u5236\u683C\u5F0F\u8BF4\u660E" }), l.jsx(et, { label: "\u68C0\u6D4B\u51FA\u53E3 IP" }), l.jsx(et, { label: "\u91CD\u65B0\u5339\u914D" }), l.jsx(et, { label: "\u505C\u7528" }), l.jsx(et, { label: "\u5220\u9664" })] }) })] }, p.id)) })] }), l.jsx(Ct, { page: v.page, totalPages: v.totalPages, onPageChange: v.setPage }), l.jsx(_t, { emptyText: "\u6682\u65E0\u4EE3\u7406\u3002", filteredText: "\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u4EE3\u7406", shown: f.length, total: e.entries.length })] });
}
function vh(e) {
  const t = xt(e.rows.filter((m) => Hl(m.date)).map((m) => m.totalBytes)), n = xt(e.rows.filter((m) => Wl(m.date)).map((m) => m.totalBytes)), [r, a] = C.useState(""), [s, i] = C.useState("all"), o = e.rows.filter((m) => {
    const x = r.trim().toLowerCase(), y = !x || m.proxyEntry.username.toLowerCase().includes(x) || m.date.includes(x) || pe(m.proxyEntry.targetCountry, m.proxyEntry.targetRegion, m.proxyEntry.targetCity).toLowerCase().includes(x), L = s === "all" || s === "today" && Hl(m.date) || s === "month" && Wl(m.date);
    return y && L;
  }), u = new Set(o.map((m) => m.proxyEntryId)), f = r.trim() || s !== "all" ? e.entries.filter((m) => u.has(m.id)) : e.entries, v = Tt(f, 10), p = Tt(o, 10), g = !!r.trim() || s !== "all";
  return l.jsxs(l.Fragment, { children: [l.jsxs("section", { className: "metric-grid compact", children: [l.jsx(M, { label: "\u4ECA\u65E5\u6D41\u91CF", value: re(String(t)) }), l.jsx(M, { label: "\u672C\u6708\u6D41\u91CF", value: re(String(n)) }), l.jsx(M, { label: "\u6709\u8BB0\u5F55\u4EE3\u7406", value: String(new Set(e.rows.map((m) => m.proxyEntryId)).size) }), l.jsx(M, { label: "\u8FDE\u63A5\u6B21\u6570", value: String(e.rows.reduce((m, x) => m + x.connections, 0)) }), l.jsx(M, { label: "\u4EE3\u7406\u6570\u91CF", value: String(e.entries.length) })] }), l.jsxs(H, { title: "\u6BCF\u6761\u4EE3\u7406\u7528\u91CF", count: f.length, children: [l.jsxs("div", { className: "table-tools", children: [l.jsxs("label", { children: ["\u641C\u7D22", l.jsx("input", { value: r, onChange: (m) => a(m.target.value), placeholder: "\u4EE3\u7406\u8D26\u53F7\u3001\u65E5\u671F\u3001\u5730\u533A" })] }), l.jsxs("label", { children: ["\u65E5\u671F", l.jsxs("select", { value: s, onChange: (m) => i(m.target.value), children: [l.jsx("option", { value: "all", children: "\u5168\u90E8\u65E5\u671F" }), l.jsx("option", { value: "today", children: "\u4ECA\u5929" }), l.jsx("option", { value: "month", children: "\u672C\u6708" })] })] }), g && l.jsx("button", { type: "button", onClick: () => {
    a(""), i("all");
  }, children: "\u91CD\u7F6E\u7B5B\u9009" })] }), l.jsx(Et, { items: [{ label: "\u641C\u7D22", value: r.trim() || null, onClear: r.trim() ? () => a("") : null }, { label: "\u65E5\u671F", value: s === "all" ? null : s === "today" ? "\u4ECA\u5929" : "\u672C\u6708", onClear: s === "all" ? null : () => i("all") }] }), l.jsx(Nt, { shown: f.length, total: e.entries.length }), l.jsxs(St, { minWidth: 780, children: [l.jsx("thead", { children: l.jsxs("tr", { children: [l.jsx("th", { children: "\u4EE3\u7406\u8D26\u53F7" }), l.jsx("th", { children: "\u76EE\u6807\u5730\u533A" }), l.jsx("th", { children: "\u7D2F\u8BA1\u7528\u91CF" }), l.jsx("th", { children: "\u8FDE\u63A5\u6B21\u6570" })] }) }), l.jsx("tbody", { children: v.rows.map((m) => {
    const x = o.filter((c) => c.proxyEntryId === m.id), y = x.reduce((c, d) => c + d.connections, 0), L = xt(x.map((c) => c.totalBytes));
    return l.jsxs("tr", { children: [l.jsx("td", { children: l.jsx("strong", { children: m.username }) }), l.jsx("td", { children: pe(m.targetCountry, m.targetRegion, m.targetCity) }), l.jsx("td", { children: re(String(L)) }), l.jsx("td", { children: y })] }, m.id);
  }) })] }), l.jsx(Ct, { page: v.page, totalPages: v.totalPages, onPageChange: v.setPage }), l.jsx(_t, { emptyText: "\u6682\u65E0\u4EE3\u7406\u7528\u91CF\u3002", filteredText: "\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u4EE3\u7406\u7528\u91CF", shown: f.length, total: e.entries.length })] }), l.jsxs(H, { title: "\u6BCF\u65E5\u8BB0\u5F55", count: o.length, children: [l.jsx(Et, { items: [{ label: "\u641C\u7D22", value: r.trim() || null, onClear: r.trim() ? () => a("") : null }, { label: "\u65E5\u671F", value: s === "all" ? null : s === "today" ? "\u4ECA\u5929" : "\u672C\u6708", onClear: s === "all" ? null : () => i("all") }] }), l.jsx(Nt, { shown: o.length, total: e.rows.length }), l.jsxs(St, { minWidth: 900, children: [l.jsx("thead", { children: l.jsxs("tr", { children: [l.jsx("th", { children: "\u65E5\u671F" }), l.jsx("th", { children: "\u4EE3\u7406\u8D26\u53F7" }), l.jsx("th", { children: "\u4E0A\u884C" }), l.jsx("th", { children: "\u4E0B\u884C" }), l.jsx("th", { children: "\u603B\u6D41\u91CF" }), l.jsx("th", { children: "\u8FDE\u63A5\u6B21\u6570" })] }) }), l.jsx("tbody", { children: p.rows.map((m) => l.jsxs("tr", { children: [l.jsx("td", { children: m.date }), l.jsx("td", { children: m.proxyEntry.username }), l.jsx("td", { children: re(m.bytesUp) }), l.jsx("td", { children: re(m.bytesDown) }), l.jsx("td", { children: re(m.totalBytes) }), l.jsx("td", { children: m.connections })] }, m.id)) })] }), l.jsx(Ct, { page: p.page, totalPages: p.totalPages, onPageChange: p.setPage }), l.jsx(_t, { emptyText: "\u6682\u65E0\u6D41\u91CF\u8BB0\u5F55\u3002", filteredText: "\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u6D41\u91CF\u8BB0\u5F55", shown: o.length, total: e.rows.length })] })] });
}
function Jc(e) {
  return l.jsx("nav", { className: "side-nav", "aria-label": e.label, children: e.children });
}
function Je(e) {
  return l.jsx("button", { className: e.active ? "nav-button active" : "nav-button", type: "button", onClick: e.onClick, children: e.children });
}
function H(e) {
  return l.jsxs("section", { className: "panel", children: [l.jsxs("div", { className: "section-heading", children: [l.jsx("h2", { children: e.title }), e.count !== void 0 && l.jsx("span", { children: e.loading ? "\u8BFB\u53D6\u4E2D" : `${e.count} \u6761` })] }), e.children] });
}
function M(e) {
  return l.jsxs("div", { className: e.tone ? `metric ${e.tone}` : "metric", children: [l.jsx("span", { children: e.label }), l.jsx("strong", { children: e.value })] });
}
function Zc(e) {
  const t = Math.max(1, e.items.reduce((n, r) => n + r.value, 0));
  return l.jsx("div", { className: "bar-list", children: e.items.map((n) => l.jsxs("div", { className: "bar-row", children: [l.jsxs("div", { className: "bar-meta", children: [l.jsx("span", { children: n.label }), l.jsx("strong", { children: n.value })] }), l.jsx("div", { className: "bar-track", children: l.jsx("span", { className: `bar-fill ${n.tone}`, style: { width: `${Math.max(3, Math.round(n.value / t * 100))}%` } }) })] }, n.label)) });
}
function yh(e) {
  const t = Eh(7).map((r) => {
    const a = xt(e.rows.filter((s) => s.date === r).map((s) => s.totalBytes));
    return { date: r, total: a };
  }), n = Math.max(1, ...t.map((r) => r.total));
  return l.jsx("div", { className: "traffic-bars", children: t.map((r) => l.jsxs("div", { className: "traffic-day", children: [l.jsx("div", { className: "traffic-column", children: l.jsx("span", { style: { height: `${Math.max(4, Math.round(r.total / n * 100))}%` } }) }), l.jsx("strong", { children: re(String(r.total)) }), l.jsx("em", { children: r.date.slice(5) })] }, r.date)) });
}
function xh(e) {
  const t = Pe.map((r) => {
    const a = e.upstreams.filter((s) => s.country === r.value);
    return { label: r.label, value: a.length, free: a.filter((s) => s.status === "free").length };
  }), n = Math.max(1, ...t.map((r) => r.value));
  return l.jsx("div", { className: "inventory-list", children: t.map((r) => l.jsxs("div", { className: "inventory-row", children: [l.jsx("span", { children: r.label }), l.jsx("div", { className: "bar-track", children: l.jsx("span", { className: "bar-fill info", style: { width: `${Math.max(3, Math.round(r.value / n * 100))}%` } }) }), l.jsxs("strong", { children: [r.free, "/", r.value] })] }, r.label)) });
}
function sl(e) {
  return l.jsxs("div", { className: "health-line", children: [l.jsx("span", { children: e.label }), l.jsx("strong", { children: e.value })] });
}
function pt(e) {
  return l.jsxs("div", { className: "setting", children: [l.jsx("span", { children: e.label }), l.jsx("strong", { children: e.value })] });
}
function B(e) {
  return l.jsxs("div", { className: "detail-item", children: [l.jsx("span", { children: e.label }), l.jsx("strong", { children: e.value })] });
}
function ji(e) {
  return l.jsxs("div", { className: "copy-guide", children: [l.jsx("span", { children: e.passwordText }), l.jsxs("ol", { children: [l.jsx("li", { children: "\u5148\u590D\u5236\u6574\u884C\u4EE3\u7406\u5B57\u7B26\u4E32\u3002" }), l.jsx("li", { children: "\u5982\u679C\u8F6F\u4EF6\u4E0D\u80FD\u6574\u884C\u5BFC\u5165\uFF0C\u5C31\u770B\u4E0B\u9762\u62C6\u5F00\u7684\u4E3B\u673A\u3001\u7AEF\u53E3\u3001\u7528\u6237\u540D\u3001\u5BC6\u7801\u3002" }), l.jsx("li", { children: "\u6309\u987A\u5E8F\u586B\u5199\uFF1A\u4E3B\u673A\u3001\u7AEF\u53E3\u3001\u7528\u6237\u540D\u3001\u5BC6\u7801\u3002" })] })] });
}
function St(e) {
  return l.jsxs(l.Fragment, { children: [l.jsx("p", { className: "table-scroll-hint", children: "\u8868\u683C\u5217\u8F83\u591A\u65F6\uFF0C\u53EF\u4EE5\u5DE6\u53F3\u6EDA\u52A8\u67E5\u770B\u66F4\u591A\u3002" }), l.jsx("div", { className: e.maxHeight ? "table-wrap scroll-table" : "table-wrap", style: e.maxHeight ? { maxHeight: e.maxHeight } : void 0, children: l.jsx("table", { style: { minWidth: e.minWidth }, children: e.children }) })] });
}
function xr(e) {
  return l.jsx("div", { className: "modal-backdrop", role: "presentation", children: l.jsxs("section", { className: "modal", role: "dialog", "aria-modal": "true", "aria-label": e.title, children: [l.jsxs("div", { className: "modal-head", children: [l.jsx("h2", { children: e.title }), l.jsx("button", { type: "button", onClick: e.onClose, "aria-label": "\u5173\u95ED", children: "\u5173\u95ED" })] }), e.children] }) });
}
function Ct(e) {
  return e.totalPages <= 1 ? null : l.jsxs("div", { className: "pagination", children: [l.jsx("button", { type: "button", "aria-label": "\u4E0A\u4E00\u9875", disabled: e.page <= 1, onClick: () => e.onPageChange(e.page - 1), title: "\u4E0A\u4E00\u9875", children: "\u4E0A\u4E00\u9875" }), l.jsxs("span", { children: ["\u7B2C ", e.page, " / \u5171 ", e.totalPages, " \u9875"] }), l.jsx("button", { type: "button", "aria-label": "\u4E0B\u4E00\u9875", disabled: e.page >= e.totalPages, onClick: () => e.onPageChange(e.page + 1), title: "\u4E0B\u4E00\u9875", children: "\u4E0B\u4E00\u9875" })] });
}
function Nt(e) {
  const t = e.shown === e.total ? `\u5F53\u524D\u663E\u793A\u5168\u90E8 ${e.total} \u6761` : `\u5F53\u524D\u7B5B\u9009 ${e.shown} / \u5171 ${e.total} \u6761`;
  return l.jsx("p", { className: "filter-summary", children: t });
}
function Et(e) {
  const t = e.items.filter((n) => n.value);
  return t.length === 0 ? null : l.jsxs("div", { className: "active-filters", "aria-live": "polite", children: [l.jsx("span", { className: "active-filters-title", children: "\u5F53\u524D\u7B5B\u9009" }), t.map((n) => l.jsxs("span", { children: [l.jsx("strong", { children: n.label }), l.jsx("em", { children: n.value }), n.onClear && l.jsx("button", { type: "button", className: "active-filters-clear", onClick: n.onClear, "aria-label": `\u6E05\u9664${n.label}\u7B5B\u9009`, children: "\xD7" })] }, `${n.label}:${n.value}`))] });
}
function Yn(e) {
  return l.jsx("div", { className: "action-row", children: e.children });
}
const zo = "\u5F85\u5B89\u5168\u6D41\u7A0B\uFF1A\u9700\u8981\u786E\u8BA4\u3001\u65E5\u5FD7\u548C\u56DE\u6EDA\u89C4\u5219\u540E\u518D\u5F00\u653E";
function et(e) {
  return l.jsxs("button", { "aria-label": `${e.label}\uFF0C${zo}`, className: "deferred-action-button", disabled: true, title: zo, type: "button", children: [l.jsx("span", { children: e.label }), l.jsx("em", { children: "\u5F85\u5B89\u5168\u6D41\u7A0B" })] });
}
function Pt(e) {
  return l.jsx("p", { className: "empty-state", children: e.text });
}
function _t(e) {
  return e.shown > 0 ? null : l.jsx(Pt, { text: e.total === 0 ? e.emptyText : `${e.filteredText}\uFF0C\u53EF\u4EE5\u91CD\u7F6E\u7B5B\u9009\u3002` });
}
function bh(e) {
  return !e.error && !e.notice ? null : l.jsxs("section", { className: "message-stack", "aria-live": "polite", children: [e.error && l.jsx("p", { className: "message error", children: e.error }), e.notice && l.jsx("p", { className: "message success", children: e.notice })] });
}
function dt(e) {
  return l.jsx("span", { className: `status ${e.status}`, children: Lt(e.status) });
}
function jh(e) {
  const t = /* @__PURE__ */ new Map();
  for (const n of e) {
    const r = n.country || "unknown", a = n.region || "any", s = n.city || "any", i = `${r}/${a}/${s}`, o = t.get(i) ?? { bad: 0, city: n.city, country: n.country, free: 0, key: i, label: pe(r, a, s), locked: 0, region: n.region, total: 0 };
    o.total += 1, n.status === "free" && (o.free += 1), n.status === "locked" && (o.locked += 1), ["bad", "disabled", "cooldown"].includes(n.status) && (o.bad += 1), t.set(i, o);
  }
  return [...t.values()].sort((n, r) => r.total - n.total || n.label.localeCompare(r.label));
}
function wh(e, t) {
  try {
    const n = localStorage.getItem(e);
    if (!n) return null;
    const r = JSON.parse(n);
    return !r.token || !r.user || r.user.role !== t ? null : r;
  } catch {
    return null;
  }
}
function Fo(e) {
  return e.reduce((t, n) => (t[n] = (t[n] ?? 0) + 1, t), {});
}
function wi(e) {
  const t = e.split(":");
  if (t.length < 4) return null;
  const [n, r, a, ...s] = t, i = s.join(":");
  return !n || !r || !a || !i ? null : { host: n, port: r, username: a, password: i };
}
function Tt(e, t) {
  const [n, r] = C.useState(1), a = Math.max(1, Math.ceil(e.length / t)), s = Math.min(n, a);
  return C.useEffect(() => {
    n !== s && r(s);
  }, [n, s]), { page: s, rows: e.slice((s - 1) * t, s * t), setPage: r, totalPages: a };
}
function kh(e) {
  return Object.values(e).reduce((t, n) => t + n, 0);
}
function xt(e) {
  return e.reduce((t, n) => {
    const r = Number(n);
    return t + (Number.isFinite(r) ? r : 0);
  }, 0);
}
function ki(e, t) {
  return !t || t <= 0 ? 0 : Math.max(0, Math.min(100, Math.round(e / t * 100)));
}
function ed(e, t) {
  const n = Number(e), r = Number(t);
  return !n || n <= 0 ? "\u4E0D\u9650" : re(String(Math.max(0, n - r)));
}
function Sh(e) {
  return !e || e.length === 0 ? "\u672A\u8BBE\u7F6E" : e.map((t) => {
    var n;
    return ((n = Pe.find((r) => r.value === t)) == null ? void 0 : n.label) || t.toUpperCase();
  }).join(", ");
}
function pe(e, t, n) {
  return [e == null ? void 0 : e.toUpperCase(), t, n].filter(Boolean).join(" / ") || "\u4E0D\u9650";
}
function re(e) {
  const t = Number(e);
  return !Number.isFinite(t) || t <= 0 ? "0 B" : t < 1024 ? `${t} B` : t < 1024 * 1024 ? `${(t / 1024).toFixed(1)} KB` : t < 1024 * 1024 * 1024 ? `${(t / 1024 / 1024).toFixed(1)} MB` : `${(t / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
function td(e) {
  return Number(e) > 0 ? re(e) : "\u4E0D\u9650";
}
function Ch(e) {
  const t = Number(e);
  if (!Number.isFinite(t) || t <= 0) return "0";
  const n = t / 1024 / 1024 / 1024;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}
function nd(e) {
  return typeof e == "number" ? `${e} ms` : "\u672A\u6D4B";
}
function It(e) {
  return e ? new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(e)) : "\u65E0";
}
function Nh(e) {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(e);
}
function Ra(e) {
  return e % (60 * 6e4) === 0 ? `${e / (60 * 6e4)} \u5C0F\u65F6` : e % 6e4 === 0 ? `${e / 6e4} \u5206\u949F` : e % 1e3 === 0 ? `${e / 1e3} \u79D2` : `${e} ms`;
}
function Eh(e) {
  return Array.from({ length: e }, (t, n) => {
    const r = /* @__PURE__ */ new Date();
    return r.setDate(r.getDate() - (e - n - 1)), r.toISOString().slice(0, 10);
  });
}
function Lt(e) {
  return { active: "\u542F\u7528", bad: "\u5931\u8D25", cooldown: "\u51B7\u5374", dead: "\u5931\u6548", disabled: "\u505C\u7528", failed: "\u5931\u8D25", free: "\u7A7A\u95F2", healthy: "\u5145\u8DB3", locked: "\u5DF2\u7ED1\u5B9A", low: "\u504F\u4F4E", success: "\u6210\u529F" }[e] || e;
}
function za(e) {
  return { admin_proxy_entry_create: "\u7BA1\u7406\u5458\u521B\u5EFA\u4EE3\u7406", proxy_entry_status_update: "\u4FEE\u6539\u4EE3\u7406\u72B6\u6001", user_proxy_entry_create: "\u7528\u6237\u521B\u5EFA\u4EE3\u7406", user_create: "\u521B\u5EFA\u7528\u6237", user_password_reset: "\u91CD\u7F6E\u7528\u6237\u5BC6\u7801", user_settings_update: "\u4FEE\u6539\u7528\u6237\u8BBE\u7F6E", upstream_import: "\u5BFC\u5165\u4E0A\u6E38" }[e] || e;
}
function Uo(e) {
  const t = cn(e.detail) ? e.detail : {}, n = typeof t.username == "string" ? t.username : "";
  if (e.action === "user_password_reset") {
    const r = typeof t.passwordSource == "string" ? t.passwordSource : "new";
    return `${n || "\u7528\u6237"}\uFF1A\u5BC6\u7801\u5DF2\u91CD\u7F6E\uFF08${r === "generated" ? "\u7CFB\u7EDF\u751F\u6210" : "\u624B\u52A8\u586B\u5199"}\uFF09\uFF0C\u660E\u6587\u672A\u5165\u65E5\u5FD7`;
  }
  if (e.action === "user_create") {
    const r = typeof t.passwordSource == "string" ? t.passwordSource : "generated", a = ke(t.trafficQuotaGb), s = ke(t.maxProxyEntries), i = ke(t.allowedCountries);
    return `${n || "\u7528\u6237"}\uFF1A\u5DF2\u521B\u5EFA\uFF08\u5BC6\u7801${r === "generated" ? "\u7CFB\u7EDF\u751F\u6210" : "\u624B\u52A8\u586B\u5199"}\uFF0C\u603B\u989D\u5EA6 ${a} GB\uFF0C\u4EE3\u7406\u4E0A\u9650 ${s}\uFF0C\u5141\u8BB8\u56FD\u5BB6 ${i}\uFF09`;
  }
  if (e.action === "admin_proxy_entry_create") {
    const r = typeof t.username == "string" ? t.username : "\u7528\u6237", a = typeof t.proxyEntryUsername == "string" ? t.proxyEntryUsername : "\u65B0\u4EE3\u7406", s = typeof t.passwordSource == "string" ? t.passwordSource : "generated", i = pe(typeof t.targetCountry == "string" ? t.targetCountry : null, typeof t.targetRegion == "string" ? t.targetRegion : null, typeof t.targetCity == "string" ? t.targetCity : null);
    return `${r}\uFF1A\u5DF2\u521B\u5EFA\u4EE3\u7406 ${a}\uFF08${i}\uFF0C\u5BC6\u7801${s === "generated" ? "\u7CFB\u7EDF\u751F\u6210" : "\u624B\u52A8\u586B\u5199"}\uFF09`;
  }
  if (e.action === "upstream_import") {
    const r = ke(t.created), a = ke(t.duplicates), s = ke(t.failed), i = ke(t.validLines), o = ke(t.invalidLines);
    return `\u5DF2\u5BFC\u5165\u4E0A\u6E38\uFF08\u65B0\u589E ${r}\uFF0C\u91CD\u590D ${a}\uFF0C\u5931\u8D25 ${s}\uFF0C\u6709\u6548\u884C ${i}\uFF0C\u65E0\u6548\u884C ${o}\uFF09`;
  }
  if (e.action === "proxy_entry_status_update") {
    const r = typeof t.username == "string" ? t.username : "\u7528\u6237", a = typeof t.proxyEntryUsername == "string" ? t.proxyEntryUsername : "\u4EE3\u7406", s = cn(t.changes) ? t.changes : {}, i = cn(s.status) ? s.status : null, o = pe(typeof t.targetCountry == "string" ? t.targetCountry : null, typeof t.targetRegion == "string" ? t.targetRegion : null, typeof t.targetCity == "string" ? t.targetCity : null), u = i ? ke(i.from) : "\u65E0", f = i ? ke(i.to) : "\u65E0";
    return `${r}\uFF1A\u4EE3\u7406 ${a} \u72B6\u6001 ${Lt(u)} -> ${Lt(f)}\uFF08${o}\uFF09`;
  }
  if (e.action === "user_proxy_entry_create") {
    const r = typeof t.username == "string" ? t.username : "\u7528\u6237", a = typeof t.proxyEntryUsername == "string" ? t.proxyEntryUsername : "\u65B0\u4EE3\u7406", s = typeof t.passwordSource == "string" ? t.passwordSource : "generated", i = pe(typeof t.targetCountry == "string" ? t.targetCountry : null, typeof t.targetRegion == "string" ? t.targetRegion : null, typeof t.targetCity == "string" ? t.targetCity : null);
    return `${r}\uFF1A\u5DF2\u81EA\u52A9\u521B\u5EFA\u4EE3\u7406 ${a}\uFF08${i}\uFF0C\u5BC6\u7801${s === "generated" ? "\u7CFB\u7EDF\u751F\u6210" : "\u624B\u52A8\u586B\u5199"}\uFF09`;
  }
  if (e.action === "user_settings_update") {
    const r = cn(t.changes) ? t.changes : {}, a = Object.entries(r).filter(([s]) => !ld(s)).map(([s, i]) => _h(s, i));
    return `${n || "\u7528\u6237"}\uFF1A${a.length > 0 ? a.join("\uFF1B") : "\u8BBE\u7F6E\u5DF2\u66F4\u65B0"}`;
  }
  return Ph(t);
}
function rd(e) {
  return { status: "\u72B6\u6001", trafficQuotaGb: "\u603B\u989D\u5EA6", maxProxyEntries: "\u4EE3\u7406\u4E0A\u9650", allowedCountries: "\u5141\u8BB8\u56FD\u5BB6" }[e] || e;
}
function Ph(e) {
  if (!cn(e)) return "\u65E0\u8BE6\u60C5";
  const t = Object.entries(e).filter(([n]) => !ld(n)).slice(0, 4).map(([n, r]) => `${rd(n)}=${ke(r)}`);
  return t.length > 0 ? t.join("\uFF1B") : "\u65E0\u53EF\u663E\u793A\u8BE6\u60C5";
}
function ke(e) {
  return e == null ? "\u65E0" : typeof e == "string" || typeof e == "number" || typeof e == "boolean" ? String(e) : Array.isArray(e) ? e.every((t) => typeof t == "string") ? e.map((t) => Th(t)).join(", ") : `${e.length} \u9879` : "\u5DF2\u8BB0\u5F55";
}
function _h(e, t) {
  const n = rd(e);
  if (e === "allowedCountries" && cn(t)) {
    const r = ke(t.from), a = ke(t.to);
    return `${n} ${r} -> ${a}`;
  }
  return cn(t) && "from" in t && "to" in t ? `${n} ${ke(t.from)} -> ${ke(t.to)}` : n;
}
function ld(e) {
  const t = e.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return /password|passwd|pwd|secret|token|apikey|privatekey|accesskey|credential|authorization|auth|bearer|cookie|session|jwt|csrf|signature/.test(t);
}
function cn(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
function Th(e) {
  var t;
  return ((t = Pe.find((n) => n.value === e.toLowerCase())) == null ? void 0 : t.label) || e.toUpperCase();
}
function Hl(e) {
  return e === (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function Wl(e) {
  return e.startsWith((/* @__PURE__ */ new Date()).toISOString().slice(0, 7));
}
Xc(document.getElementById("root")).render(l.jsx(Xp, {}));
