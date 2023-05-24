main();

function main() {
    var editorVlang = ace.edit("editorVlang");
    editorVlang.setTheme("ace/theme/dracula");
    editorVlang.setOptions({
        fontFamily: "JetBrains Mono",
        fontSize: "14pt"
    });
    editorVlang.session.setMode("ace/mode/golang");


    var editor = ace.edit("editorJson");
    editor.setTheme("ace/theme/dracula");
    editor.setOptions({
        fontFamily: "JetBrains Mono",
        fontSize: "14pt"
    });
    editor.session.setMode("ace/mode/json");

    editor.getSession().on('change', function () {
        try {
            const code = JsonToStruct(editor.getValue())

            editorVlang.setValue(code);
        } catch (e) {
            console.log(e)
        }
    });
}

const RESERVED_WORDS = [
    'struct',
    'interface',
    'union',
    'type',
    'enum',


    'for',
    'pub',
    'fn',
    'import',
    'if',
    'else',
    'return',
    'break',
    'continue',
    'spawn',
    'go',
    'defer',
    'goto',

    
    'mut',
    'const',
    'map',
    'int',
    'i8',
    'i16',
    'i32',
    'i64',
    'u8',
    'u16',
    'u32',
    'u64',
    'f32',
    'f64',
    'bool',
    'string',
    'rune',
    'byte',
    'nil',
    'true',
    'false',
]

var FlagOmitEmpty = false;
var FlagReserverdWords = false;
var FlagStructAnon = false;
function loadFlags() {
    FlagOmitEmpty = document.getElementById('ck_omitempty').checked;
    FlagReserverdWords = document.getElementById('ck_reserved_word').checked;
    FlagStructAnon = document.getElementById('ck_struct_anon').checked;
}

/**
 * 
 * @param input
 * @returns {{nameType: string, view: string, base: string}}
 */
function getType(input) {
    type = typeof (input);
    if (type === 'number')
        return {
            nameType: Number.isInteger(input) ? 'int' : 'f32',
            view: Number.isInteger(input) ? 'int' : 'f32',
            base: 'number',
        };
    else if (type === 'boolean')
        return {
            nameType: 'bool',
            base: type,
            view: 'bool'
        }
    else if (Array.isArray(input))
        return {
            nameType: 'array',
            base: 'array',
            view: '[]'
        }

    return {
        nameType: type,
        view: type,
        base: type
    };
}


String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.substr(1);
}


/** @type {{nameType: string, type: string, types: []Object}[]} */
let afterImplementation = [];


function pushAfterImplementation(type) {
    if (afterImplementation.find(it => it.nameType === type.nameType) === undefined)
        afterImplementation.push(type);
}


/**
 * @description Sets the property name to a suitable name in the V language standard
 * @param {string} name
 * @returns {{ name: string, replaceName: string }}
 * */
function resolverNameProperty(name) {
    let final_name = '';
    for (let i = 0; i < name.length; i++) {
        const char = name[i];
        if (char === char.toUpperCase())
            final_name += `_${char.toLowerCase()}`;
        else
            final_name += char;
    }
    final_name = final_name.charAt(0) == '_' ? final_name.substr(1) : final_name;
    final_name = final_name.replace(/[^a-zA-Z0-9_]/g, '').replace(/_{2,}/g, '_');

    if (RESERVED_WORDS.includes(final_name))
        final_name = `${final_name}_`;
    
    return { name: final_name, replaceName: final_name !== name ? `json: "${name}"` : '' };
}


/**
 * @description Sets the type name to a suitable name in the V language standard
 * */
function resolverNameType(name) {
    let final_name = '';
    let isUpper = false;
    for (let i = 0; i < name.length; i++) {
        const char = name[i];
        if (char !== '_')
            if (isUpper) {
                final_name += char.toUpperCase();
                isUpper = false;
            } else
                final_name += char;
        else
            isUpper = true;
    }
    final_name = final_name.charAt(0).toLocaleUpperCase() + final_name.substr(1);
    return final_name.replace(/[^a-zA-Z0-9_]/g, '').replace(/_{2,}/g, '_');
}


/**
 * @description Construct a attribute of property
 * @param {string} attrib
 * @returns {string}
 */
function constructAttribute(attrib) {

    let attribs = attrib === '' || attrib === undefined ? [] : [attrib];

    if (FlagOmitEmpty)
        attribs.push('ominitempty');

    if (attribs.length === 0)
        return '';
    else if (attribs.length === 1)
        return `[${attribs.join('')}]`;
    
    return `[${attribs.join('; ')}]`;
}


/**
 * @description Add a new type to the list of types to be implemented and convert the json to struct
 */
function JsonToStruct(js, type_obj = undefined) {


    loadFlags();


    afterImplementation = [];
    let code = ConstructStrucFromJson(js, type_obj).code;


    codeAfeterImplementation = afterImplementation.map(it => {
        if (it.type == 'sumType')
            return `type ${it.nameType} = ${it.types.map(it => it.view).join(' | ')}`;
        else if (it.types.length == 0)
            return `struct ${it.nameType}{}`;
        else
            return `struct ${it.nameType} {\n${it.types[0]}}\n`;
    }).join('\n');


    code += `\n\n${codeAfeterImplementation}`;

    return code;
}



/**
 * 
 * @param {string | object} js 
 * @param {{nameType: string, view: string, nameObj: string} | undefined} hiritageObj 
 * @returns {{code: string, afterImplementation: string}}
 */
function ConstructStrucFromJson(js, hiritageObj = undefined) {


    const json = typeof (js) === 'string' ? JSON.parse(js) : js;

    if (json === null)
        return { code: null };

    let typeRoot = '';
    let typesArray = [];
    const keys = Object.keys(json)



    for (const key in keys) {
        const currentType = getType(json[keys[key]]);



        if (isInsideNestedArray(hiritageObj) && currentTypeIsObject(currentType)) {
            /* into nested array */
            const contentTree = ConstructStrucFromJson(json[keys[key]],
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
            let contentTree = ConstructStrucFromJson(json[keys[key]],
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
            let contentTree = ConstructStrucFromJson(json[keys[key]],
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
                pushAfterImplementation({
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
            code: `struct Root {\n${typeRoot}}`,
            afterImplementation: ''
        };
    else if (constructStructWithArrayOfTypeUndefined(hiritageObj)) {
        typeRoot = {
            code: `type Root = []${hiritageObj.nameObj}\n`,
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

        pushAfterImplementation({
            nameType: resolverNameType(name),
            types: [typeRoot],
            type: typesArray.length > 1 ? 'sumType' : ''
        });

        typeRoot = {
            code: name
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
            pushAfterImplementation({
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