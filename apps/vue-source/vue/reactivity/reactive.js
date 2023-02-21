import {
  mutableHandlers,
  readonlyHandlers,
  shallowReactiveHandlers,
  shallowReadonlyHandlers,
} from "./baseHandlers.js";
import {
  mutableCollectionHandlers,
  readonlyCollectionHandlers,
  shallowCollectionHandlers,
  shallowReadonlyCollectionHandlers,
} from "./collectionHandlers.js";
import { toRawType } from "./index.js";

export const ReactiveFlags = {
  SKIP: "__v_skip",
  IS_REACTIVE: "__v_isReactive",
  IS_READONLY: "__v_isReadonly",
  IS_SHALLOW: "__v_isShallow",
  RAW: "__v_raw",
};

export const TargetType = {
  INVALID: 0,
  COMMON: 1,
  COLLECTION: 2,
};

export const reactiveMap = new WeakMap(); //
export const readonlyMap = new WeakMap(); //
export const shallowReactiveMap = new WeakMap(); //
export const shallowReadonlyMap = new WeakMap(); //

export const isObject = (val) => val !== null && typeof val === "object";

// 判断对象是否为只读对象
export function isReadonly(value) {
  return !!(value && value[ReactiveFlags.IS_READONLY]);
}

function targetTypeMap(rawType) {
  switch (rawType) {
    case "Object":
    case "Array":
      return TargetType.COMMON;
    case "Map":
    case "Set":
    case "WeakMap":
    case "WeakSet":
      return TargetType.COLLECTION;
    default:
      return TargetType.INVALID;
  }
}

function getTargetType(value) {
  return value[ReactiveFlags.SKIP] || !Object.isExtensible(value)
    ? TargetType.INVALID
    : targetTypeMap(toRawType(value));
}

/**
 * 创建代理对象
 * @param {*} target 目标对象
 * @param {*} isReadonly 是否只读
 * @param {*} baseHandlers
 * @param {*} collectionHandlers
 * @param {*} proxyMap
 */
function createReactiveObject(
  target,
  isReadonly,
  baseHandlers,
  collectionHandlers,
  proxyMap
) {
  if (!isObject) {
    return target;
  }

  // 已代理对象，直接返回
  if (target.RAW && !(isReadonly && target.IS_REACTIVE)) {
    return target;
  }

  // 对象存在，对应的代理对象，返回代理对象
  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  // ???? only specific value types can be observed.
  const targetType = getTargetType(target);
  if (targetType === TargetType.INVALID) {
    return target;
  }

  // 进行代理
  const proxy = new Proxy(
    target,
    targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
  );
  proxyMap.set(target, proxy); // 保存代理对象

  return proxy;
}

export function reactive(target) {
  // 本身是只读的代理对象，直接返回
  if (isReadonly(target)) {
    return target;
  }

  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    mutableCollectionHandlers,
    reactiveMap
  );
}

/**
 * 源码：153 行
 *
 * @param {*} target
 * @returns
 */
export function readonly(target) {
  return createReactiveObject(
    target,
    true,
    readonlyHandlers,
    readonlyCollectionHandlers,
    readonlyMap
  );
}


/**
 * 源码：113
 * 
 * @param {*} target 
 * @returns 
 */
export function shallowReactive(target) {
  return createReactiveObject(
    target,
    false,
    shallowReactiveHandlers,
    shallowCollectionHandlers,
    shallowReactiveMap
  );
}

/**
 * 源码：171
 * 
 * @param {*} target 
 * @returns 
 */
export function shallowReadonly(target) {
  return createReactiveObject(
    target,
    true,
    shallowReadonlyHandlers,
    shallowReadonlyCollectionHandlers,
    shallowReadonlyMap
  );
}

export function isShallow(value) {
  return !!(value && value[ReactiveFlags.IS_SHALLOW]);
}

/**
 * 返回该代理的原始对象
 * @param {*} observed
 * @returns
 */
export function toRaw(observed) {
  const raw = observed && observed[ReactiveFlags.RAW];
  return raw ? toRaw(raw) : observed;
}

/**
 * 将原始对象转换为代理对象
 * @param {*} value
 * @returns
 */
export const toReactive = (value) =>
  isObject(value) ? reactive(value) : value;
