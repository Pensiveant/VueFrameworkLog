import {
  ReactiveFlags,
  reactive,
  readonly,
  isReadonly,
  isShallow,
  isObject,
  toRaw,
  reactiveMap,
} from "./reactive.js";
import { isRef } from "./ref.js";
import { TrackOpTypes, TriggerOpTypes } from "./operations.js";
import { track, trigger, ITERATE_KEY } from "./effect.js";
import { hasOwn } from "./index.js";
import { hasChanged } from "../shared/index.js";

const __DEV__=false;

export const extend = Object.assign;

/**
 * 生成代理Get函数
 * @param {*} isReadonly 是否只读
 * @param {*} shallow
 */
function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key, receiver) {
    // 自定义的标签处理
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    } else if (key === ReactiveFlags.IS_SHALLOW) {
      return shallow;
    } else if (
      key === ReactiveFlags.RAW &&
      receiver ===
        (isReadonly
          ? shallow
            ? shallowReadonlyMap
            : readonlyMap
          : shallow
          ? shallowReactiveMap
          : reactiveMap
        ).get(target)
    ) {
      // 获取原始对象
      return target;
    }

    // 对象为数组
    const targetIsArray = Array.isArray(target);
    const res = Reflect.get(target, key, receiver);

    // 非只读，进行跟踪
    if (!isReadonly) {
      track(target, TrackOpTypes.GET, key);
    }

    if (shallow) {
      return res;
    }

    if (isRef(res)) {
      // ref unwrapping - skip unwrap for Array + integer key.
      return targetIsArray && isIntegerKey(key) ? res : res.value;
    }

    // 值为对象，递归代理
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res);
    }
    return res;
  };
}

/**
 * 源代码：161
 * 生成代理Set函数
 * @param {*} shallow
 */
function createSetter(shallow = false) {
  return function set(target, key, value, receiver) {
    let oldValue = target[key];
    // 只读、（）、（）
    if (isReadonly(oldValue) && isRef(oldValue) && !isRef(value)) {
      return false;
    }

    // 代理多层的话
    if (!shallow) {
      if (!isShallow(value) && !isReadonly(value)) {
        oldValue = toRaw(oldValue);
        value = toRaw(value);
      }
      if (!Array.isArray(target) && isRef(oldValue) && !isRef(value)) {
        oldValue.value = value;
        return true;
      }
    } else {
    }

    const hadKey =
      Array.isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key);
    const result = Reflect.set(target, key, value, receiver);
    // don't trigger if target is something up in the prototype chain of original
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        trigger(target, TriggerOpTypes.ADD, key, value);
      } else if (hasChanged(value, oldValue)) {
        trigger(target, TriggerOpTypes.SET, key, value, oldValue);
      }
    }
    return result;
  };
}

//#region mutableHandlers
const get = /*#__PURE__*/ createGetter();
const set = /*#__PURE__*/ createSetter();

function deleteProperty(target, key) {
  const hadKey = hasOwn(target, key);
  const oldValue = target[key];
  const result = Reflect.deleteProperty(target, key);
  if (result && hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue);
  }
  return result;
}

function has(target, key) {
  const result = Reflect.has(target, key);
  if (!isSymbol(key) || !builtInSymbols.has(key)) {
    track(target, TrackOpTypes.HAS, key);
  }
  return result;
}

function ownKeys(target) {
  track(target, TrackOpTypes.ITERATE, isArray(target) ? "length" : ITERATE_KEY);
  return Reflect.ownKeys(target);
}

export const mutableHandlers = {
  get,
  set,
  deleteProperty,
  has,
  ownKeys,
};
//#endregion

//#region readonlyHandlers
const readonlyGet = /*#__PURE__*/ createGetter(true);

export const readonlyHandlers = {
  get: readonlyGet,
  set(target, key) {
    if (__DEV__) {
      warn(
        `Set operation on key "${String(key)}" failed: target is readonly.`,
        target
      );
    }
    return true;
  },
  deleteProperty(target, key) {
    if (__DEV__) {
      warn(
        `Delete operation on key "${String(key)}" failed: target is readonly.`,
        target
      );
    }
    return true;
  },
};
//#endregion

//#region shallowReactiveHandlers
const shallowGet = /*#__PURE__*/ createGetter(false, true);
const shallowSet = /*#__PURE__*/ createSetter(true);

export const shallowReactiveHandlers = /*#__PURE__*/ extend(
  {},
  mutableHandlers,
  {
    get: shallowGet,
    set: shallowSet,
  }
);
//#endregion

//#region shallowReadonlyHandlers
const shallowReadonlyGet = /*#__PURE__*/ createGetter(true, true);

export const shallowReadonlyHandlers = /*#__PURE__*/ extend(
  {},
  readonlyHandlers,
  {
    get: shallowReadonlyGet,
  }
);
//#endregion
