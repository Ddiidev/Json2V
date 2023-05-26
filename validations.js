/**
 * @description Check if current type name type is an array
 * @param {{nameType: string, view: string, nameObj: string} | undefined}} hiritageObj 
 * @returns {boolean}
 */
function isInsideNestedArray(hiritageObj) {
    return hiritageObj !== undefined && hiritageObj.nameType === 'array';
}

/**
 * @description Check if current type name type is an object
 * @param {{nameType: string, view: string, base: string}} type 
 * @returns {boolean}
 */
function currentTypeIsObject(type) {
    return type.nameType === 'object';
}

/**
 * @description Check if current type name type is an object or array
 * @param {{nameType: string, view: string, base: string}} type 
 * @returns {boolean}
 */
function currentTypeIsObjectOrArray(type) {
    return ['object', 'array'].includes(type.nameType);
}


/**
 * @description Check if current type name type is an array
 * @param {{nameType: string, view: string, base: string}} type 
 * @returns {boolean}
 */
function currentTypeIsArray(type) {
    return type.nameType === 'array';
}


/**
 * @description Verify if hiritageObj is undefined, if true, the type is simple
 * @param {{nameType: string, view: string, base: string}} type 
 * @returns {boolean}
 */
function constructStructTypeSimple(hiritageObj) {
    return hiritageObj === undefined;
}


/**
 * @description Verify if hiritageObj is undefined and nameObj is Undefined, if true, the type is []Undefined
 * @param {{nameType: string, view: string, base: string}} type 
 * @returns {boolean}
 */
function constructStructWithArrayOfTypeUndefined(hiritageObj) {
    return hiritageObj !== undefined && hiritageObj.nameObj === 'Undefined';
}


/**
 * @description Verify if hiritageObj is undefined and nameObj is object, if true, the type is struct with name the key
 * @param {{nameType: string, view: string, base: string}} type 
 * @returns {boolean}
 */
function constructStructWithNewStructAux(hiritageObj) {
    return hiritageObj !== undefined && hiritageObj.nameType === 'object';
}


/**
 * @description verify if 
 * @param {{nameType: string, view: string, base: string}} type 
 * @returns {boolean}
 */
function constructStructWithSumType(type) {
    return type.length > 0;
}