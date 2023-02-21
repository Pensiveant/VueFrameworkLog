/**
 * 源代码：334
 *
 * @param {*} isReadonly
 * @param {*} shallow
 */
function createInstrumentationGetter(isReadonly, shallow) {

}

export const mutableCollectionHandlers = {
  get: /*#__PURE__*/ createInstrumentationGetter(false, false),
};

export const shallowCollectionHandlers = {
  get: /*#__PURE__*/ createInstrumentationGetter(false, true),
};

export const readonlyCollectionHandlers = {
  get: /*#__PURE__*/ createInstrumentationGetter(true, false),
};

export const shallowReadonlyCollectionHandlers = {
  get: /*#__PURE__*/ createInstrumentationGetter(true, true),
};
