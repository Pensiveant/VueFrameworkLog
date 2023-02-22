let activeEffectScope;

/**
 * 源代码：
 *
 * @param {*} effect
 * @param {*} scope
 */
export function recordEffectScope(effect, scope = activeEffectScope) {
  if (scope && scope.active) {
    scope.effects.push(effect);
  }
}
