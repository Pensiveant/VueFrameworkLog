export const isObject = (val) => val !== null && typeof val === "object";

const reactiveHandle = {
  get: (target, key, receiver) => {
    console.log(`获取属性${key}的值`);
    return target[key];
  },
  set: (target, key, value, receiver) => {
    console.log(`设置属性${key}的值`);
    target[key] = value;
  },
};

export function reactive(target) {
  // 非对象
  if (!isObject) {
    console.log("该对象无法处理为响应式对象");
    return target;
  }

  // 已代理对象
  const proxy = new Proxy(target, reactiveHandle);

  return proxy;
}

export function readonly() {}

// 只
export function shallowReactive() {}

export function shallowReadonly() {}
