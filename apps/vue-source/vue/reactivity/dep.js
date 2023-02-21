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
