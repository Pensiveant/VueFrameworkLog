import { createDep, newTracked, wasTracked } from "./dep.js";
import { recordEffectScope } from "./effectScope.js";
import { finalizeDepMarkers, initDepMarkers } from "./dep.js";

const __DEV__ = false;
let effectTrackDepth = 0; // 跟踪的深度
const maxMarkerBits = 30; // 最大跟踪深度

export let shouldTrack = true;
export let activeEffect;
export const ITERATE_KEY = Symbol(__DEV__ ? "iterate" : "");
export let trackOpBit = 1;

const targetMap = new WeakMap();
/**
 * 源代码：213行
 *
 * @param {*} target
 * @param {*} type
 * @param {*} key
 */
export function track(target, type, key) {
  // 需要跟踪以及（）才跟踪
  if (shouldTrack && activeEffect) {
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()));
    }

    let dep = depsMap.get(key);
    if (!dep) {
      depsMap.set(key, (dep = createDep()));
    }

    const eventInfo = __DEV__
      ? { effect: activeEffect, target, type, key }
      : undefined;

    trackEffects(dep, eventInfo);
  }
}

/**
 * 源代码： 232行
 *
 * @param {*} dep
 * @param {*} debuggerEventExtraInfo
 */
export function trackEffects(dep, debuggerEventExtraInfo) {
  let shouldTrack = false;
  if (effectTrackDepth <= maxMarkerBits) {
    if (!newTracked(dep)) {
      dep.n |= trackOpBit; // set newly tracked
      shouldTrack = !wasTracked(dep);
    }
  } else {
    // Full cleanup mode.
    shouldTrack = !dep.has(activeEffect);
  }

  // 省略判断非空
  if (shouldTrack) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
    if (__DEV__ && activeEffect.onTrack) {
      activeEffect.onTrack(
        extend(
          {
            effect: activeEffect,
          },
          debuggerEventExtraInfo
        )
      );
    }
  }
}

/**
 *
 * @param {*} target
 * @param {*} type
 * @param {*} key
 * @param {*} newValue
 * @param {*} oldValue
 * @param {*} oldTarget
 */
export function trigger(target, type, key, newValue, oldValue, oldTarget) {
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    // never been tracked
    return;
  }

  let deps = [];
  if (type === TriggerOpTypes.CLEAR) {
    // collection being cleared
    // trigger all effects for target
    deps = [...depsMap.values()];
  } else if (key === "length" && isArray(target)) {
    const newLength = Number(newValue);
    depsMap.forEach((dep, key) => {
      if (key === "length" || key >= newLength) {
        deps.push(dep);
      }
    });
  } else {
    // schedule runs for SET | ADD | DELETE
    if (key !== void 0) {
      deps.push(depsMap.get(key));
    }

    // also run for iteration key on ADD | DELETE | Map.SET
    switch (type) {
      case TriggerOpTypes.ADD:
        if (!isArray(target)) {
          deps.push(depsMap.get(ITERATE_KEY));
          if (isMap(target)) {
            deps.push(depsMap.get(MAP_KEY_ITERATE_KEY));
          }
        } else if (isIntegerKey(key)) {
          // new index added to array -> length changes
          deps.push(depsMap.get("length"));
        }
        break;
      case TriggerOpTypes.DELETE:
        if (!isArray(target)) {
          deps.push(depsMap.get(ITERATE_KEY));
          if (isMap(target)) {
            deps.push(depsMap.get(MAP_KEY_ITERATE_KEY));
          }
        }
        break;
      case TriggerOpTypes.SET:
        if (isMap(target)) {
          deps.push(depsMap.get(ITERATE_KEY));
        }
        break;
    }
  }

  const eventInfo = __DEV__
    ? { target, type, key, newValue, oldValue, oldTarget }
    : undefined;

  if (deps.length === 1) {
    if (deps[0]) {
      if (__DEV__) {
        triggerEffects(deps[0], eventInfo);
      } else {
        triggerEffects(deps[0]);
      }
    }
  } else {
    const effects = [];
    for (const dep of deps) {
      if (dep) {
        effects.push(...dep);
      }
    }
    if (__DEV__) {
      triggerEffects(createDep(effects), eventInfo);
    } else {
      triggerEffects(createDep(effects));
    }
  }
}

export class ReactiveEffect {
  active = true;
  deps = [];
  parent = undefined;

  /**
   * Can be attached after creation
   * @internal
   */
  computed;
  /**
   * @internal
   */
  allowRecurse;
  /**
   * @internal
   */
  deferStop;

  onStop() {}
  // dev only
  onTrack(event) {}
  // dev only
  onTrigger(event) {}

  constructor(fn, scheduler = null, scope) {
    recordEffectScope(this, scope);
  }

  run() {
    if (!this.active) {
      return this.fn();
    }
    let parent = activeEffect;
    let lastShouldTrack = shouldTrack;
    while (parent) {
      if (parent === this) {
        return;
      }
      parent = parent.parent;
    }
    try {
      this.parent = activeEffect;
      activeEffect = this;
      shouldTrack = true;

      trackOpBit = 1 << ++effectTrackDepth;

      if (effectTrackDepth <= maxMarkerBits) {
        initDepMarkers(this);
      } else {
        cleanupEffect(this);
      }
      return this.fn();
    } finally {
      if (effectTrackDepth <= maxMarkerBits) {
        finalizeDepMarkers(this);
      }

      trackOpBit = 1 << --effectTrackDepth;

      activeEffect = this.parent;
      shouldTrack = lastShouldTrack;
      this.parent = undefined;

      if (this.deferStop) {
        this.stop();
      }
    }
  }

  stop() {
    // stopped while running itself - defer the cleanup
    if (activeEffect === this) {
      this.deferStop = true;
    } else if (this.active) {
      cleanupEffect(this);
      if (this.onStop) {
        this.onStop();
      }
      this.active = false;
    }
  }
}

export function effect(fn, options) {
  if (fn.effect) {
    fn = fn.effect.fn;
  }

  const _effect = new ReactiveEffect(fn);
  if (options) {
    extend(_effect, options);
    if (options.scope) recordEffectScope(_effect, options.scope);
  }
  if (!options || !options.lazy) {
    _effect.run();
  }
  const runner = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}
