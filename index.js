import * as React from "react";

React.useEffectEvent = React.experimental_useEffectEvent;

function isShallowEqual(object1, object2) {
  const keys1 = Object.keys(object1);
  const keys2 = Object.keys(object2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (let key of keys1) {
    if (object1[key] !== object2[key]) {
      return false;
    }
  }

  return true;
}

function isTouchEvent({ nativeEvent }) {
  return window.TouchEvent
    ? nativeEvent instanceof TouchEvent
    : "touches" in nativeEvent;
}

function isMouseEvent(event) {
  return event.nativeEvent instanceof MouseEvent;
}

function throttle(cb, ms) {
  let lastTime = 0;
  return () => {
    const now = Date.now();
    if (now - lastTime >= ms) {
      cb();
      lastTime = now;
    }
  };
}

function getEnvironment() {
  const isDOM =
    typeof window !== "undefined" &&
    window.document &&
    window.document.documentElement;

  return isDOM ? "browser" : "server";
}

export function useBattery() {
  const [state, setState] = React.useState({
    supported: true,
    loading: true,
    level: null,
    charging: null,
    chargingTime: null,
    dischargingTime: null,
  });

  React.useEffect(() => {
    if (!navigator.getBattery) {
      setState((s) => ({
        ...s,
        supported: false,
        loading: false,
      }));
      return;
    }

    let battery = null;

    const handleChange = () => {
      setState({
        supported: true,
        loading: false,
        level: battery.level,
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime,
      });
    };

    navigator.getBattery().then((b) => {
      battery = b;
      handleChange();

      b.addEventListener("levelchange", handleChange);
      b.addEventListener("chargingchange", handleChange);
      b.addEventListener("chargingtimechange", handleChange);
      b.addEventListener("dischargingtimechange", handleChange);
    });

    return () => {
      if (battery) {
        battery.removeEventListener("levelchange", handleChange);
        battery.removeEventListener("chargingchange", handleChange);
        battery.removeEventListener("chargingtimechange", handleChange);
        battery.removeEventListener("dischargingtimechange", handleChange);
      }
    };
  }, []);

  return state;
}

export function useClickAway(cb) {
  const ref = React.useRef(null);
  const refCb = React.useRef(cb);

  React.useLayoutEffect(() => {
    refCb.current = cb;
  });

  React.useEffect(() => {
    const handler = (e) => {
      const element = ref.current;
      if (element && !element.contains(e.target)) {
        refCb.current(e);
      }
    };

    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);

    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  return ref;
}

function oldSchoolCopy(text) {
  const tempTextArea = document.createElement("textarea");
  tempTextArea.value = text;
  document.body.appendChild(tempTextArea);
  tempTextArea.select();
  document.execCommand("copy");
  document.body.removeChild(tempTextArea);
}

export function useCopyToClipboard() {
  const [state, setState] = React.useState(null);

  const copyToClipboard = React.useCallback((value) => {
    const handleCopy = async () => {
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(value);
          setState(value);
        } else {
          throw new Error("writeText not supported");
        }
      } catch (e) {
        oldSchoolCopy(value);
        setState(value);
      }
    };

    handleCopy();
  }, []);

  return [state, copyToClipboard];
}

export function useContinuousRetry(callback, interval = 100, options = {}) {
  const { maxRetries = Infinity } = options;
  const [hasResolved, setHasResolved] = React.useState(false);
  const onInterval = React.useEffectEvent(callback);

  React.useEffect(() => {
    let retries = 0;

    const id = window.setInterval(() => {
      if (onInterval()) {
        setHasResolved(true);
        window.clearInterval(id);
      } else if (retries >= maxRetries) {
        window.clearInterval(id);
      } else {
        retries += 1;
      }
    }, interval);

    return () => window.clearInterval(id);
  }, [interval, maxRetries]);

  return hasResolved;
}

export function useCountdown(endTime, options) {
  const [count, setCount] = React.useState(null);
  const intervalIdRef = React.useRef(null);

  const handleClearInterval = () => {
    window.clearInterval(intervalIdRef.current);
  };

  const onTick = React.useEffectEvent(() => {
    if (count === 0) {
      handleClearInterval();
      options.onComplete();
    } else {
      setCount(count - 1);
      options.onTick();
    }
  });

  React.useEffect(() => {
    intervalIdRef.current = window.setInterval(onTick, options.interval);

    return () => handleClearInterval();
  }, [options.interval]);

  React.useEffect(() => {
    setCount(Math.round((endTime - Date.now()) / options.interval));
  }, [endTime, options.interval]);

  return count;
}

export function useCounter(startingValue = 0, options = {}) {
  const { min, max } = options;

  if (min && startingValue < min) {
    throw new Error(
      `Your starting value of ${startingValue} is less than your min of ${min}.`
    );
  }

  if (max && startingValue > max) {
    throw new Error(
      `Your starting value of ${startingValue} is greater than your max of ${max}.`
    );
  }

  const [count, setCount] = React.useState(startingValue);

  const increment = () => {
    const nextCount = count + 1;
    if (max && nextCount > max) {
      return;
    }

    setCount(nextCount);
  };

  const decrement = () => {
    const nextCount = count - 1;
    if (min && nextCount < min) {
      return;
    }

    setCount(nextCount);
  };

  const set = (nextCount) => {
    if (max && nextCount > max) {
      return;
    }

    if (min && nextCount < min) {
      return;
    }

    if (nextCount === count) {
      return;
    }

    setCount(nextCount);
  };

  const reset = () => {
    if (count === startingValue) {
      return;
    }

    setCount(startingValue);
  };

  return [
    count,
    {
      increment,
      decrement,
      set,
      reset,
    },
  ];
}

export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useDefault(initialValue, defaultValue) {
  const [state, setState] = React.useState(initialValue);

  if (typeof state === "undefined" || state === null) {
    return [defaultValue, setState];
  }

  return [state, setState];
}

export function useDocumentTitle(title) {
  React.useEffect(() => {
    document.title = title;
  }, [title]);
}

export function useEventListener(target, eventName, handler, options) {
  const onEvent = React.useEffectEvent(handler);

  React.useEffect(() => {
    const targetElement = target.current ?? target;

    if (!targetElement?.addEventListener) return;

    targetElement.addEventListener(eventName, onEvent, options);

    return () => {
      targetElement.removeEventListener(eventName, onEvent);
    };
  }, [target, eventName, options]);
}

export function useFavicon(url) {
  React.useEffect(() => {
    const link =
      document.querySelector("link[rel*='icon']") ||
      document.createElement("link");
    link.type = "image/x-icon";
    link.rel = "shortcut icon";
    link.href = url;
    document.getElementsByTagName("head")[0].appendChild(link);
  }, [url]);
}

const useFetchInitialState = {
  error: undefined,
  data: undefined,
};

const useFetchReducer = (state, action) => {
  switch (action.type) {
    case "loading":
      return { ...useFetchInitialState };
    case "fetched":
      return { ...useFetchInitialState, data: action.payload };
    case "error":
      return { ...useFetchInitialState, error: action.payload };
    default:
      return state;
  }
};

export function useFetch(url, options) {
  const cacheRef = React.useRef({});

  const [state, dispatch] = React.useReducer(
    useFetchReducer,
    useFetchInitialState
  );

  const onFetch = React.useEffectEvent((url) => {
    return fetch(url, options);
  });

  React.useEffect(() => {
    if (typeof url !== "string") return;

    let ignore = false;

    const fetchData = async () => {
      const cachedResponse = cacheRef.current[url];

      if (cachedResponse) {
        dispatch({ type: "fetched", payload: cachedResponse });
        return;
      }

      dispatch({ type: "loading" });

      try {
        const res = await onFetch(url);

        if (!res.ok) {
          throw new Error(res.statusText);
        }

        const json = await res.json();
        cacheRef.current[url] = json;

        if (ignore === false) {
          dispatch({ type: "fetched", payload: json });
        }
      } catch (e) {
        if (ignore === false) {
          dispatch({ type: "error", payload: e });
        }
      }
    };

    fetchData();

    return () => {
      ignore = true;
    };
  }, [url]);

  return state;
}

export function useGeolocation(options = {}) {
  const [state, setState] = React.useState({
    loading: true,
    accuracy: null,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    latitude: null,
    longitude: null,
    speed: null,
    timestamp: null,
    error: null,
  });

  const optionsRef = React.useRef(options);

  React.useEffect(() => {
    const onEvent = ({ coords, timestamp }) => {
      setState({
        loading: false,
        timestamp,
        latitude: coords.latitude,
        longitude: coords.longitude,
        altitude: coords.altitude,
        accuracy: coords.accuracy,
        altitudeAccuracy: coords.altitudeAccuracy,
        heading: coords.heading,
        speed: coords.speed,
      });
    };

    const onEventError = (error) => {
      setState((s) => ({
        ...s,
        loading: false,
        error,
      }));
    };

    navigator.geolocation.getCurrentPosition(
      onEvent,
      onEventError,
      optionsRef.current
    );

    const watchId = navigator.geolocation.watchPosition(
      onEvent,
      onEventError,
      optionsRef.current
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return state;
}

const initialUseHistoryStateState = {
  past: [],
  present: null,
  future: [],
};

const useHistoryStateReducer = (state, action) => {
  const { past, present, future } = state;

  if (action.type === "UNDO") {
    return {
      past: past.slice(0, past.length - 1),
      present: past[past.length - 1],
      future: [present, ...future],
    };
  } else if (action.type === "REDO") {
    return {
      past: [...past, present],
      present: future[0],
      future: future.slice(1),
    };
  } else if (action.type === "SET") {
    const { newPresent } = action;

    if (action.newPresent === present) {
      return state;
    }

    return {
      past: [...past, present],
      present: newPresent,
      future: [],
    };
  } else if (action.type === "CLEAR") {
    return {
      ...initialState,
      present: action.initialPresent,
    };
  } else {
    throw new Error("Unsupported action type");
  }
};

export function useHistoryState(initialPresent = {}) {
  const initialPresentRef = React.useRef(initialPresent);

  const [state, dispatch] = React.useReducer(useHistoryStateReducer, {
    ...initialUseHistoryStateState,
    present: initialPresentRef.current,
  });

  const canUndo = state.past.length !== 0;
  const canRedo = state.future.length !== 0;

  const undo = React.useCallback(() => {
    if (canUndo) {
      dispatch({ type: "UNDO" });
    }
  }, [canUndo]);

  const redo = React.useCallback(() => {
    if (canRedo) {
      dispatch({ type: "REDO" });
    }
  }, [canRedo]);

  const set = React.useCallback(
    (newPresent) => dispatch({ type: "SET", newPresent }),
    []
  );

  const clear = React.useCallback(
    () =>
      dispatch({ type: "CLEAR", initialPresent: initialPresentRef.current }),
    []
  );

  return { state: state.present, set, undo, redo, clear, canUndo, canRedo };
}

export function useHover() {
  const [hovering, setHovering] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const node = ref.current;

    if (!node) return;

    const handleMouseEnter = () => {
      setHovering(true);
    };

    const handleMouseLeave = () => {
      setHovering(false);
    };

    node.addEventListener("mouseenter", handleMouseEnter);
    node.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      node.removeEventListener("mouseenter", handleMouseEnter);
      node.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return [ref, hovering];
}

export function useIdle(ms = 1000 * 60) {
  const [idle, setIdle] = React.useState(false);

  React.useEffect(() => {
    let timeoutId;

    const handleTimeout = () => {
      setIdle(true);
    };

    const handleEvent = throttle((e) => {
      setIdle(false);

      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(handleTimeout, ms);
    }, 500);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleEvent();
      }
    };

    timeoutId = window.setTimeout(handleTimeout, ms);

    window.addEventListener("mousemove", handleEvent);
    window.addEventListener("mousedown", handleEvent);
    window.addEventListener("resize", handleEvent);
    window.addEventListener("keydown", handleEvent);
    window.addEventListener("touchstart", handleEvent);
    window.addEventListener("wheel", handleEvent);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("mousemove", handleEvent);
      window.removeEventListener("mousedown", handleEvent);
      window.removeEventListener("resize", handleEvent);
      window.removeEventListener("keydown", handleEvent);
      window.removeEventListener("touchstart", handleEvent);
      window.removeEventListener("wheel", handleEvent);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearTimeout(timeoutId);
    };
  }, [ms]);

  return idle;
}

export function useIntersectionObserver(options = {}) {
  const { threshold = 1, root = null, rootMargin = "0%" } = options;
  const ref = React.useRef(null);
  const [entry, setEntry] = React.useState(null);

  React.useEffect(() => {
    const node = ref?.current;

    if (!node || typeof IntersectionObserver !== "function") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setEntry(entry);
      },
      { threshold, root, rootMargin }
    );

    observer.observe(node);

    return () => {
      setEntry(null);
      observer.disconnect();
    };
  }, [threshold, root, rootMargin]);

  return [ref, entry];
}

export function useInterval(cb, ms) {
  const id = React.useRef(null);
  const onInterval = React.useEffectEvent(cb);

  const handleClearInterval = () => {
    window.clearInterval(id.current);
  };

  React.useEffect(() => {
    id.current = window.setInterval(onInterval, ms);
    return handleClearInterval;
  }, [ms]);

  return handleClearInterval;
}

export function useIntervalWhen(cb, { ms, when, startImmediately }) {
  const id = React.useRef(null);
  const onTick = React.useEffectEvent(cb);
  const immediatelyCalled = React.useRef(
    startImmediately === true ? false : null
  );

  const handleClearInterval = () => {
    window.clearInterval(id.current);
    immediatelyCalled.current = false;
  };

  React.useEffect(() => {
    if (
      when === true &&
      startImmediately === true &&
      immediatelyCalled.current === false
    ) {
      onTick();
      immediatelyCalled.current = true;
    }
  }, [startImmediately, when]);

  React.useEffect(() => {
    if (when === true) {
      id.current = window.setInterval(onTick, ms);
      return handleClearInterval;
    }
  }, [ms, when]);

  return handleClearInterval;
}

export function useIsClient() {
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}

export function useIsFirstRender() {
  const renderRef = React.useRef(true);

  if (renderRef.current === true) {
    renderRef.current = false;
    return true;
  }

  return renderRef.current;
}

export function useKeyPress(key, cb, options = {}) {
  const { event = "keydown", target = window ?? null, eventOptions } = options;

  const onListen = React.useEffectEvent((target, event) => {
    const handler = (event) => {
      if (event.key === key) {
        cb(event);
      }
    };

    target.addEventListener(event, handler, eventOptions);

    return () => {
      target.removeEventListener(event, handler);
    };
  });

  React.useEffect(() => {
    return onListen(target, event);
  }, [target, event]);
}

export function useList(defaultList = []) {
  const [list, setList] = React.useState(defaultList);

  const set = React.useCallback((l) => {
    setList(l);
  }, []);

  const push = React.useCallback((element) => {
    setList((l) => [...l, element]);
  }, []);

  const removeAt = React.useCallback((index) => {
    setList((l) => [...l.slice(0, index), ...l.slice(index + 1)]);
  }, []);

  const insertAt = React.useCallback((index, element) => {
    setList((l) => [...l.slice(0, index), element, ...l.slice(index)]);
  }, []);

  const updateAt = React.useCallback((index, element) => {
    setList((l) => l.map((e, i) => (i === index ? element : e)));
  }, []);

  const clear = React.useCallback(() => setList([]), []);

  return [list, { set, push, removeAt, insertAt, updateAt, clear }];
}

export function useLocalStorage(key, initialValue) {
  if (getEnvironment() === "server") {
    throw Error("useLocalStorage is a client-side only hook.");
  }

  const readValue = React.useCallback(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [localState, setLocalState] = React.useState(readValue);
  const handleSetState = React.useCallback(
    (value) => {
      try {
        const nextState =
          typeof value === "function" ? value(localState) : value;
        window.localStorage.setItem(key, JSON.stringify(nextState));
        setLocalState(nextState);
        window.dispatchEvent(new Event("local-storage"));
      } catch (e) {
        console.warn(e);
      }
    },
    [key, localState]
  );

  const onStorageChange = React.useEffectEvent(() => {
    setLocalState(readValue());
  });

  React.useEffect(() => {
    window.addEventListener("storage", onStorageChange);
    window.addEventListener("local-storage", onStorageChange);

    return () => {
      window.removeEventListener("storage", onStorageChange);
      window.removeEventListener("local-storage", onStorageChange);
    };
  }, []);

  return [localState, handleSetState];
}

export function useLockBodyScroll() {
  React.useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);
}

export function useLogger(name, ...rest) {
  const initialRenderRef = React.useRef(true);

  const handleLog = React.useEffectEvent((event) => {
    console.log(`${name} ${event}:`, rest);
  });

  React.useEffect(() => {
    if (initialRenderRef.current === false) {
      handleLog("updated");
    }
  });

  React.useEffect(() => {
    handleLog("mounted");
    initialRenderRef.current = false;

    return () => {
      handleLog("unmounted");
      initialRenderRef.current = true;
    };
  }, []);
}

export function useLongPress(
  callback,
  { threshold = 400, onStart, onFinish, onCancel } = {}
) {
  const isLongPressActive = React.useRef(false);
  const isPressed = React.useRef(false);
  const timerId = React.useRef();
  const cbRef = React.useRef(callback);

  React.useLayoutEffect(() => {
    cbRef.current = callback;
  });

  const start = React.useCallback(
    () => (event) => {
      if (isPressed.current) return;

      if (!isMouseEvent(event) && !isTouchEvent(event)) return;

      if (onStart) {
        onStart(event);
      }

      isPressed.current = true;
      timerId.current = setTimeout(() => {
        cbRef.current(event);
        isLongPressActive.current = true;
      }, threshold);
    },
    [onStart, threshold]
  );

  const cancel = React.useCallback(
    () => (event) => {
      if (!isMouseEvent(event) && !isTouchEvent(event)) return;

      if (isLongPressActive.current) {
        if (onFinish) {
          onFinish(event);
        }
      } else if (isPressed.current) {
        if (onCancel) {
          onCancel(event);
        }
      }

      isLongPressActive.current = false;
      isPressed.current = false;

      if (timerId.current) {
        window.clearTimeout(timerId.current);
      }
    },
    [onFinish, onCancel]
  );

  return React.useMemo(() => {
    if (callback === null) {
      return {};
    }

    const mouseHandlers = {
      onMouseDown: start(),
      onMouseUp: cancel(),
      onMouseLeave: cancel(),
    };

    const touchHandlers = {
      onTouchStart: start(),
      onTouchEnd: cancel(),
    };

    return {
      ...mouseHandlers,
      ...touchHandlers,
    };
  }, [callback, cancel, start]);
}

export function useMap(initialState) {
  const mapRef = React.useRef(new Map(initialState));
  const [, reRender] = React.useReducer((x) => x + 1, 0);

  mapRef.current.set = (...args) => {
    Map.prototype.set.apply(mapRef.current, args);
    reRender();
    return mapRef.current;
  };

  mapRef.current.clear = (...args) => {
    Map.prototype.clear.apply(mapRef.current, args);
    reRender();
  };

  mapRef.current.delete = (...args) => {
    const res = Map.prototype.delete.apply(mapRef.current, args);
    reRender();

    return res;
  };

  return mapRef.current;
}

export function useMeasure() {
  const ref = React.useRef(null);
  const [rect, setRect] = React.useState({
    width: null,
    height: null,
  });

  React.useLayoutEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect) {
        setRect({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(ref.current);
    return () => {
      observer.disconnect();
    };
  }, []);

  return [ref, rect];
}

export function useMediaQuery(query) {
  const subscribe = React.useCallback(
    (callback) => {
      const matchMedia = window.matchMedia(query);

      matchMedia.addEventListener("change", callback);
      return () => {
        matchMedia.removeEventListener("change", callback);
      };
    },
    [query]
  );

  const getSnapshot = () => {
    return window.matchMedia(query).matches;
  };

  const getServerSnapshot = () => {
    throw Error("useMediaQuery is a client-only hook");
  };

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useMouse() {
  const [state, setState] = React.useState({
    x: 0,
    y: 0,
    elementX: 0,
    elementY: 0,
    elementPositionX: 0,
    elementPositionY: 0,
  });

  const ref = React.useRef(null);

  React.useLayoutEffect(() => {
    const handleMouseMove = (event) => {
      let newState = {
        x: event.pageX,
        y: event.pageY,
      };

      if (ref.current instanceof HTMLElement) {
        const { left, top } = ref.current.getBoundingClientRect();
        const elementPositionX = left + window.pageXOffset;
        const elementPositionY = top + window.pageYOffset;
        const elementX = event.pageX - elementPositionX;
        const elementY = event.pageY - elementPositionY;

        newState.elementX = elementX;
        newState.elementY = elementY;
        newState.elementPositionX = elementPositionX;
        newState.elementPositionY = elementPositionY;
      }

      setState((s) => {
        return {
          ...s,
          ...newState,
        };
      });
    };

    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return [state, ref];
}

const getConnection = () => {
  return (
    navigator?.connection ||
    navigator?.mozConnection ||
    navigator?.webkitConnection
  );
};

export function useNetworkState() {
  const cache = React.useRef({});

  const subscribe = React.useCallback((callback) => {
    window.addEventListener("online", callback, { passive: true });
    window.addEventListener("offline", callback, { passive: true });

    const connection = getConnection();

    if (connection) {
      connection.addEventListener("change", callback, { passive: true });
    }

    return () => {
      window.removeEventListener("online", callback);
      window.removeEventListener("offline", callback);

      if (connection) {
        connection.removeEventListener("change", callback);
      }
    };
  }, []);

  const getSnapshot = () => {
    const online = navigator.onLine;
    const connection = getConnection();

    const nextState = {
      online,
      downlink: connection?.downlink,
      downlinkMax: connection?.downlinkMax,
      effectiveType: connection?.effectiveType,
      rtt: connection?.rtt,
      saveData: connection?.saveData,
      type: connection?.type,
    };

    if (isShallowEqual(cache.current, nextState)) {
      return cache.current;
    } else {
      cache.current = nextState;
      return nextState;
    }
  };

  const getServerSnapshot = () => {
    throw Error("useNetworkState is a client-only hook");
  };

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useObjectState(initialValue) {
  const [state, setState] = React.useState(initialValue);

  const handleUpdate = React.useCallback((arg) => {
    if (typeof arg === "function") {
      setState((s) => {
        const newState = arg(s);

        return {
          ...s,
          ...newState,
        };
      });
    }

    if (typeof arg === "object") {
      setState((s) => ({
        ...s,
        ...arg,
      }));
    }
  }, []);

  return [state, handleUpdate];
}

export function useOrientation() {
  const [orientation, setOrientation] = React.useState({
    angle: 0,
    type: "landscape-primary",
  });

  React.useLayoutEffect(() => {
    const handleChange = () => {
      const { angle, type } = window.screen.orientation;
      setOrientation({
        angle,
        type,
      });
    };

    const handle_orientationchange = () => {
      setOrientation({
        type: "UNKNOWN",
        angle: window.orientation,
      });
    };

    if (window.screen?.orientation) {
      handleChange();
      window.screen.orientation.addEventListener("change", handleChange);
    } else {
      handle_orientationchange();
      window.addEventListener("orientationchange", handle_orientationchange);
    }

    return () => {
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener("change", handleChange);
      } else {
        window.removeEventListener(
          "orientationchange",
          handle_orientationchange
        );
      }
    };
  }, []);

  return orientation;
}

export function usePageLeave(cb) {
  const onLeave = React.useEffectEvent((event) => {
    const from = event.relatedTarget || event.toElement;
    if (!from || from.nodeName === "HTML") {
      cb();
    }
  });

  React.useEffect(() => {
    document.addEventListener("mouseout", onLeave);

    return () => {
      document.removeEventListener("mouseout", onLeave);
    };
  }, []);
}

const usePreferredLanguageSubscribe = (cb) => {
  window.addEventListener("languagechange", cb);
  return () => window.removeEventListener("languagechange", cb);
};

const getPreferredLanguageSnapshot = () => {
  return navigator.language;
};

const getPreferredLanguageServerSnapshot = () => {
  throw Error("usePreferredLanguage is a client-only hook");
};

export function usePreferredLanguage() {
  return React.useSyncExternalStore(
    usePreferredLanguageSubscribe,
    getPreferredLanguageSnapshot,
    getPreferredLanguageServerSnapshot
  );
}

export function usePrevious(newValue) {
  const previousRef = React.useRef();

  React.useEffect(() => {
    previousRef.current = newValue;
  });

  return previousRef.current;
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function useRandomInterval(cb, { minDelay, maxDelay }) {
  const timeoutId = React.useRef(null);
  const onInterval = React.useEffectEvent(cb);

  const handleClearTimeout = () => {
    window.clearTimeout(timeoutId.current);
  };

  React.useEffect(() => {
    const tick = () => {
      const interval = getRandomNumber(minDelay, maxDelay);
      timeoutId.current = window.setTimeout(() => {
        onInterval();
        tick();
      }, interval);
    };

    tick();

    return handleClearTimeout;
  }, [minDelay, maxDelay]);

  return handleClearTimeout;
}

export function useQueue(initialValue = []) {
  const [queue, setQueue] = React.useState(initialValue);

  const add = React.useCallback((element) => {
    setQueue((q) => [...q, element]);
  }, []);

  const remove = React.useCallback(() => {
    let removedElement;

    setQueue(([first, ...q]) => {
      removedElement = first;
      return q;
    });

    return removedElement;
  }, []);

  const clear = React.useCallback(() => {
    setQueue([]);
  }, []);

  return {
    add,
    remove,
    clear,
    first: queue[0],
    last: queue[queue.length - 1],
    size: queue.length,
    queue,
  };
}

export function useRenderCount() {
  const count = React.useRef(0);

  count.current++;

  return count.current;
}

export function useRenderInfo(name = "Unknown") {
  const count = React.useRef(0);
  const lastRender = React.useRef();
  const now = Date.now();

  count.current++;

  React.useEffect(() => {
    lastRender.current = Date.now();
  });

  const sinceLastRender = lastRender.current ? now - lastRender.current : 0;

  if (process.env.NODE_ENV !== "production") {
    const info = {
      name,
      renders: count.current,
      sinceLastRender,
      timestamp: now,
    };

    console.log(info);

    return info;
  }
}

export function useSessionStorage(key, initialValue) {
  if (getEnvironment() === "server") {
    throw Error("useSessionStorage is a client-side only hook.");
  }

  const readValue = React.useCallback(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [localState, setLocalState] = React.useState(readValue);

  const handleSetState = React.useCallback(
    (value) => {
      try {
        const nextState =
          typeof value === "function" ? value(localState) : value;
        window.sessionStorage.setItem(key, JSON.stringify(nextState));
        setLocalState(nextState);
      } catch (e) {
        console.warn(e);
      }
    },
    [key, localState]
  );

  return [localState, handleSetState];
}

export function useScript(src, options = {}) {
  const [status, setStatus] = React.useState(() => {
    if (!src) {
      return "idle";
    }

    return "loading";
  });

  const cachedScriptStatuses = React.useRef({});

  React.useEffect(() => {
    if (!src) {
      return;
    }

    const cachedScriptStatus = cachedScriptStatuses.current[src];
    if (cachedScriptStatus === "ready" || cachedScriptStatus === "error") {
      setStatus(cachedScriptStatus);
      return;
    }

    let script = document.querySelector(`script[src="${src}"]`);

    if (script) {
      setStatus(
        script.getAttribute("data-status") ?? cachedScriptStatus ?? "loading"
      );
    } else {
      script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.setAttribute("data-status", "loading");
      document.body.appendChild(script);

      const setAttributeFromEvent = (event) => {
        const scriptStatus = event.type === "load" ? "ready" : "error";

        if (script) {
          script.setAttribute("data-status", scriptStatus);
        }
      };

      script.addEventListener("load", setAttributeFromEvent);
      script.addEventListener("error", setAttributeFromEvent);
    }

    const setStateFromEvent = (event) => {
      const newStatus = event.type === "load" ? "ready" : "error";
      setStatus(newStatus);
      cachedScriptStatuses.current[src] = newStatus;
    };

    script.addEventListener("load", setStateFromEvent);
    script.addEventListener("error", setStateFromEvent);

    return () => {
      if (script) {
        script.removeEventListener("load", setStateFromEvent);
        script.removeEventListener("error", setStateFromEvent);
      }

      if (script && options.removeOnUnmount) {
        script.remove();
      }
    };
  }, [src, options.removeOnUnmount]);

  return status;
}

export function useSet(values) {
  const setRef = React.useRef(new Set(values));
  const [, reRender] = React.useReducer((x) => x + 1, 0);

  setRef.current.add = (...args) => {
    const res = Set.prototype.add.apply(setRef.current, args);
    reRender();

    return res;
  };

  setRef.current.clear = (...args) => {
    Set.prototype.clear.apply(setRef.current, args);
    reRender();
  };

  setRef.current.delete = (...args) => {
    const res = Set.prototype.delete.apply(setRef.current, args);
    reRender();

    return res;
  };

  return setRef.current;
}

export function useThrottle(value, interval = 500) {
  const [throttledValue, setThrottledValue] = React.useState(value);
  const lastUpdated = React.useRef();

  React.useEffect(() => {
    const now = Date.now();

    if (now >= lastUpdated.current + interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const id = window.setTimeout(() => {
        lastUpdated.current = now;
        setThrottledValue(value);
      }, interval);

      return () => window.clearTimeout(id);
    }
  }, [value, interval]);

  return throttledValue;
}

export function useTimeout(cb, ms) {
  const id = React.useRef(null);
  const onTimeout = React.useEffectEvent(cb);

  const handleClearTimeout = () => {
    window.clearTimeout(id.current);
  };

  React.useEffect(() => {
    id.current = window.setTimeout(onTimeout, ms);

    return handleClearTimeout;
  }, [ms]);

  return handleClearTimeout;
}

export function useToggle(initialValue) {
  const [on, setOn] = React.useState(initialValue);

  const handleToggle = React.useCallback((value) => {
    if (typeof value === "boolean") {
      return setOn(value);
    }

    return setOn((v) => !v);
  }, []);

  return [on, handleToggle];
}

const useVisibilityChangeSubscribe = (callback) => {
  document.addEventListener("visibilitychange", callback);

  return () => {
    document.removeEventListener("visibilitychange", callback);
  };
};

const getVisibilityChangeSnapshot = () => {
  return document.visibilityState;
};

const getVisibilityChangeServerSnapshot = () => {
  throw Error("useVisibilityChange is a client-only hook");
};

export function useVisibilityChange() {
  const visibilityState = React.useSyncExternalStore(
    useVisibilityChangeSubscribe,
    getVisibilityChangeSnapshot,
    getVisibilityChangeServerSnapshot
  );

  return visibilityState === "visible";
}

export function useWindowScroll() {
  const [state, setState] = React.useState({
    x: null,
    y: null,
  });

  const scrollTo = React.useCallback((...args) => {
    if (typeof args[0] === "object") {
      window.scrollTo(args[0]);
    } else if (typeof args[0] === "number" && typeof args[1] === "number") {
      window.scrollTo(args[0], args[1]);
    } else {
      throw new Error(
        `Invalid arguments passed to scrollTo. See here for more info. https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollTo`
      );
    }
  }, []);

  React.useLayoutEffect(() => {
    const handleScroll = () => {
      setState({ x: window.pageXOffset, y: window.pageYOffset });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return [state, scrollTo];
}

export function useWindowSize() {
  const [size, setSize] = React.useState({
    width: null,
    height: null,
  });

  React.useLayoutEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return size;
}
