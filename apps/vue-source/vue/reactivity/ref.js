import { toRaw, toReactive, isReadonly, isShallow } from "./reactive.js";

/**
 * 源代码：73
 *
 * @param {*} r
 * @returns
 */
export function isRef(r) {
  return !!(r && r.__v_isRef === true);
}

class RefImpl {
  _value;
  _rawValue;

  dep = undefined;
  __v_isRef = true;

  constructor(value, __v_isShallow) {
    this._rawValue = __v_isShallow ? value : toRaw(value);
    this._value = __v_isShallow ? value : toReactive(value);
  }

  get value() {
    trackRefValue(this);
    return this._value;
  }

  set value(newVal) {
    const useDirectValue =
      this.__v_isShallow || isShallow(newVal) || isReadonly(newVal);
    newVal = useDirectValue ? newVal : toRaw(newVal);
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal;
      this._value = useDirectValue ? newVal : toReactive(newVal);
      triggerRefValue(this, newVal);
    }
  }
}

function createRef(rawValue, shallow) {
  if (isRef(rawValue)) {
    return rawValue;
  }
  return new RefImpl(rawValue, shallow);
}

export function ref(value) {
  return createRef(value, false);
}
