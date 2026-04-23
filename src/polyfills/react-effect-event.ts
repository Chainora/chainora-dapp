import ReactDefault, {
  useCallback,
  useInsertionEffect,
  useLayoutEffect,
  useRef,
} from 'react';
import * as ReactNamespace from 'react';

type AnyFn = (...args: unknown[]) => unknown;

type ReactWithEffectEvent = {
  useEffectEvent?: unknown;
  [key: string]: unknown;
};

const LOG_PREFIX = '[react-polyfill]';

const polyfill = function useEffectEventPolyfill<T extends AnyFn>(fn: T): T {
  const handlerRef = useRef<T>(fn);

  const updateEffect =
    typeof useInsertionEffect === 'function' ? useInsertionEffect : useLayoutEffect;

  updateEffect(() => {
    handlerRef.current = fn;
  });

  return useCallback(
    ((...args: unknown[]) => handlerRef.current(...args)) as T,
    [],
  );
};

const installPolyfillOn = (target: ReactWithEffectEvent | null | undefined): void => {
  if (!target || typeof target.useEffectEvent === 'function') {
    return;
  }

  try {
    Object.defineProperty(target, 'useEffectEvent', {
      value: polyfill,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    return;
  } catch {
    // fall back to direct assignment below
  }

  try {
    target.useEffectEvent = polyfill;
  } catch {
    // nothing else we can do here; the final check below will diagnose
  }
};

// The Vite dev server pre-bundles react as a CJS-interop module that re-exports
// `require_react()` via the default export only. Dependencies such as
// `@initia/interwovenkit-react` then access `import_react.useEffectEvent` at call
// time. To make the property visible to those consumers we must mutate the
// underlying CJS exports object, which lives behind the default import.
// We also patch the namespace copy for different bundler setups.
const defaultCandidate = ReactDefault as unknown as ReactWithEffectEvent;
installPolyfillOn(defaultCandidate);

const namespaceDefault = (ReactNamespace as unknown as { default?: ReactWithEffectEvent }).default;
if (namespaceDefault && namespaceDefault !== defaultCandidate) {
  installPolyfillOn(namespaceDefault);
}

installPolyfillOn(ReactNamespace as unknown as ReactWithEffectEvent);

if (typeof (ReactDefault as unknown as ReactWithEffectEvent).useEffectEvent !== 'function') {
  console.error(
    `${LOG_PREFIX} useEffectEvent still missing — the interwovenkit dep will crash`,
  );
}
