export let trackOpBit = 1;

/**
 * 源码： 21
 *
 * @param {*} effects
 * @returns
 */
export const createDep = (effects) => {
  const dep = new Set(effects);
  dep.w = 0;
  dep.n = 0;
  return dep;
};

/**
 * 源码： 30
 *
 * @param {*} dep
 * @returns
 */
export const newTracked = (dep) => (dep.n & trackOpBit) > 0;

/**
 * 源码： 28
 *
 * @param {*} dep
 * @returns
 */
export const wasTracked = (dep) => (dep.w & trackOpBit) > 0;

/**
 * 源码： 40
 *
 * @param {*} effect
 */
export const finalizeDepMarkers = (effect) => {
  const { deps } = effect;
  if (deps.length) {
    let ptr = 0;
    for (let i = 0; i < deps.length; i++) {
      const dep = deps[i];
      if (wasTracked(dep) && !newTracked(dep)) {
        dep.delete(effect);
      } else {
        deps[ptr++] = dep;
      }
      // clear bits
      dep.w &= ~trackOpBit;
      dep.n &= ~trackOpBit;
    }
    deps.length = ptr;
  }
};

/**
 * 
 * @param {*} param0 
 */
export const initDepMarkers = ({ deps }) => {
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].w |= trackOpBit; // set was tracked
    }
  }
};
