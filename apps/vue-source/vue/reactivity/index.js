import {
  reactive,
  readonly,
  shallowReactive,
  shallowReadonly,
} from "./reactive.js";

export const hasOwn = (val, key) => hasOwnProperty.call(val, key);
export const objectToString = Object.prototype.toString;
export const toTypeString = (value) => objectToString.call(value);

export const toRawType = (value) => {
  // extract "RawType" from strings like "[object RawType]"
  return toTypeString(value).slice(8, -1);
};

export { ref } from "./ref.js";

import { effect } from "./effect.js";

export { reactive, readonly, shallowReactive, shallowReadonly, effect };
