try {
    /**
     * bypass in the import failure in purely browser environment and with that I can still have a basic autocomplete.
     * Imports are happening in html.
     */
    var { } = require('./validations.js');
    var { } = require('./resolvers.js');
    var { } = require('./types.js');
} catch { }

/** @type {{nameType: string, type: string, types: []Object}[]} */
let afterImplementationTypes = [];

/** @type {Map<string, string>} */
let implementationTypeBySignature = new Map();

const defaultJson = '{\n\t"example_construct_struct": "",\n\t"person": {\n\t\t"name": "André",\n\t\t"age": 26\n\t}\n}';
const lastJsonLocalStorageKey = 'json2v:last-json';

var editorVlang = ace.edit("editorVlang");
var editorJson = ace.edit("editorJson");

main();
function main() {
    editorVlang.setTheme("ace/theme/dracula");
    editorVlang.setOptions({
        fontFamily: "JetBrains Mono",
        fontSize: "14pt"
    });
    editorVlang.session.setMode("ace/mode/golang");


    editorJson.setTheme("ace/theme/dracula");
    editorJson.setOptions({
        fontFamily: "JetBrains Mono",
        fontSize: "14pt"
    });
    editorJson.session.setMode("ace/mode/json");
    editorJson.getSession().on('change', runCode);

    editorJson.setValue(getLastJson());
    loadFlags();
}

function getLastJson() {
    try {
        const lastJson = localStorage.getItem(lastJsonLocalStorageKey);
        return lastJson !== null ? lastJson : defaultJson;
    } catch {
        return defaultJson;
    }
}

function saveLastJson(json) {
    try {
        localStorage.setItem(lastJsonLocalStorageKey, json);
    } catch { }
}

function runCode() {
    try {
        const json = editorJson.getValue();
        saveLastJson(json);

        const code = jsonToStruct(json)

        if (code === null)
            return;

        editorVlang.setValue(code);
    } catch (e) {
        console.log(e)
    }
}

var flagAllPublic = true;
var flagOmitEmpty = true;
var flagReserverdWordsWithAt = false;
var flagStructAnon = false;
var flagReuseIdenticalStructs = true;
function loadFlags() {
    flagAllPublic = document.getElementById('ck_all_pubblic').checked;
    flagOmitEmpty = document.getElementById('ck_omitempty').checked;
    flagReserverdWordsWithAt = document.getElementById('ck_reserved_word').checked;
    flagStructAnon = document.getElementById('ck_struct_anon').checked;
    flagReuseIdenticalStructs = document.getElementById('ck_reuse_identical_structs').checked;
    runCode();
}


String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.substr(1);
}


function pushAfterImplementationType(type) {
    if (afterImplementationTypes.find(it => it.nameType === type.nameType) === undefined)
        afterImplementationTypes.push(type);
}

function getImplementationTypeSignature(fields) {
    return fields
        .trim()
        .split('\n')
        .map(it => it.trim())
        .filter(it => it !== '')
        .sort()
        .join('\n');
}


function getSortedJsonKeys(json) {
    const keys = Object.keys(json);

    if (Array.isArray(json))
        return keys;

    return keys.sort((left, right) => {
        const leftProperty = resolverNameProperty(left).name;
        const rightProperty = resolverNameProperty(right).name;
        return leftProperty.localeCompare(rightProperty);
    });
}

function resolveImplementationType(nameType, fields, type = '') {
    const signature = getImplementationTypeSignature(fields);
    const existentNameType = implementationTypeBySignature.get(signature);

    if (existentNameType !== undefined)
        return existentNameType;

    implementationTypeBySignature.set(signature, nameType);
    pushAfterImplementationType({
        nameType: nameType,
        types: [fields],
        type: type
    });

    return nameType;
}


/**
 * @description Add a new type to the list of types to be implemented and convert the json to struct
 */
function jsonToStruct(js, type_obj = undefined) {
    afterImplementationTypes = [];
    implementationTypeBySignature = new Map();
    let code = constructStrucFromJson(js, type_obj).code;

    if (code === null)
        return null;

    codeAfeterImplementation = afterImplementationTypes.map(it => {
        if (it.type == 'sumType')
            return `${canIsPublic()}type ${it.nameType} = ${it.types.map(it => it.view).join(' | ')}`;
        else if (it.types.length == 0)
            return `${canIsPublic()}struct ${it.nameType}{}`;
        else
        {
            debugger
            return `${canIsPublic()}struct ${it.nameType} {${canIsPublicForFields(it.types[0])}\n${it.types[0]}}\n`;
        }
    }).join('\n');


    code += `\n\n${codeAfeterImplementation}`;

    return code;
}

function canIsPublic() {
    if (flagAllPublic)
        return 'pub ';
    else
        return '';
}

function canIsPublicForFields(fields, ident) {
    if (fields !== undefined && fields === "")
        return '';
    else if (flagAllPublic)
        return `\n${ident ?? ''}pub mut:`;
    else
        return '';
}

/**
 * 
 * @param {string | object} js 
 * @param {{nameType: string, view: string, nameObj: string} | undefined} hiritageObj 
 * @returns {{code: string, afterImplementation: string}}
 */
function constructStrucFromJson(js, hiritageObj = undefined) {


    const json = (() => {
        try {
            return typeof (js) === 'string' ? JSON.parse(js) : js;
        } catch {
            return null;
        }
    })();

    if (json === null)
        return { code: null };

    let typeRoot = '';
    let typesArray = [];
    const keys = getSortedJsonKeys(json);



    for (const key in keys) {
        const currentType = getType(json[keys[key]]);



        if (isInsideNestedArray(hiritageObj) && currentTypeIsObject(currentType)) {
            /* into nested array */
            const contentTree = constructStrucFromJson(json[keys[key]],
                {
                    ...currentType,
                    nameObj: hiritageObj
                });

            typesArray.push({
                ...currentType,
                view: contentTree.code,
                nameType: contentTree.code
            });

        } else if (isInsideNestedArray(hiritageObj))
            /* into nested array */
            typesArray.push(currentType);

        else if (!currentTypeIsObjectOrArray(currentType)) {
            /* Simples key */
            const property = resolverNameProperty(keys[key]);
            const attribute = constructAttribute(property.replaceName);
            typeRoot += `\t${property.name} ${currentType.view} ${attribute}\n`

        } else if (currentTypeIsArray(currentType)) {
            /* Get element by element of array */
            let contentTree = constructStrucFromJson(json[keys[key]],
                {
                    ...currentType,
                    nameObj: !Array.isArray(json) ? keys[key] : undefined
                });

            if (contentTree === '')
                contentTree = { code: 'Any' };

            const property = resolverNameProperty(keys[key]);
            const attribute = constructAttribute(property.replaceName);
            typeRoot += `\t${property.name} []${contentTree.code} ${attribute}\n`

        } else {
            /**
             * Object or Array of key nested
             */
            let contentTree = constructStrucFromJson(json[keys[key]],
                {
                    ...currentType,
                    nameObj: !Array.isArray(json) ? keys[key] : undefined
                });


            if (Array.isArray(json)) {
                hiritageObj = {
                    ...currentType,
                    nameObj: contentTree.code
                }
            }
            else if (contentTree.code === null) {
                pushAfterImplementationType({
                    nameType: 'Any',
                    type: 'Any',
                    types: []
                });
                const property = resolverNameProperty(keys[key]);
                const attribute = constructAttribute(property.replaceName);
                typeRoot += `\t${property.name} Any ${attribute}\n`
            }
            else {

                const property = resolverNameProperty(keys[key]);
                const attribute = constructAttribute(property.replaceName);
                typeRoot += `\t${property.name} ${contentTree.code} ${attribute}\n`
            }
        }
    }



    if (constructStructTypeSimple(hiritageObj))
        typeRoot = {
            code: `${canIsPublic()}struct Root {${canIsPublicForFields()}\n${typeRoot}}`,
            afterImplementation: ''
        };
    else if (constructStructWithArrayOfTypeUndefined(hiritageObj)) {
        typeRoot = {
            code: `${canIsPublic()}type Root = []${hiritageObj.nameObj}\n`,
            afterImplementation: ''
        };
    }
    else if (constructStructWithNewStructAux(hiritageObj)) {

        const name = (() => {
            if (hiritageObj.nameObj !== undefined && hiritageObj.nameObj.nameObj !== undefined)
                return resolverNameType(hiritageObj.nameObj.nameObj);
            else if (hiritageObj.nameObj !== undefined)
                return resolverNameType(hiritageObj.nameObj);
            else
                return 'Undefined';
        })();

        const nameType = resolverNameType(name);
        let resolvedNameType = nameType;

        if (!flagStructAnon) {
            if (flagReuseIdenticalStructs)
                resolvedNameType = resolveImplementationType(nameType, typeRoot, typesArray.length > 1 ? 'sumType' : '');
            else
                pushAfterImplementationType({
                    nameType: nameType,
                    types: [typeRoot],
                    type: typesArray.length > 1 ? 'sumType' : ''
                });
        }

        typeRoot = {
            code: !flagStructAnon ? resolvedNameType : `struct {${canIsPublicForFields(typeRoot.trim(), `\t`)}\n${typeRoot.replaceAll('\t', '\t\t')}\t}`,
        };
    }
    else if (constructStructWithSumType(typesArray)) {
        typesArray = _.sortBy(_.sortedUniqBy(typesArray, it => it.nameType), it => it.nameType);

        const typeNumbers = typesArray.filter(it => ['int', 'f32'].includes(it.nameType));
        if (typeNumbers.length > 1) {
            typesArray = typesArray.filter(it => !(['int', 'f32'].includes(it.nameType)));
            typesArray.push(typeNumbers.find(it => it.nameType === 'f32'));
        }

        const name = (() => {
            if (typesArray.length > 1)
                return typesArray.map(x => x.view.capitalize()).join('');
            else
                return typesArray[0].view;
        })();

        if (typesArray.length > 1)
            pushAfterImplementationType({
                nameType: name,
                types: typesArray,
                type: typesArray.length > 1 ? 'sumType' : ''
            });

        typeRoot = {
            code: name
        };
    }
    return typeRoot;
}
