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
    return final_name.replace(/[^a-zA-Z0-9_]/g, '').replace(/_{2,}/g, '_');
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
 * @description Add a new type to the list of types to be implemented and convert the json to struct
 */
function JsonToStruct(js, type_obj = undefined) {
    afterImplementation = [];
    let code = ConstructStrucFromJson(js, type_obj).code;


    codeAfeterImplementation = afterImplementation.map(it => {
        if (it.type == 'sumType')
            return `type ${it.nameType} = ${it.types.map(it => it.view).join(' | ')}`;
        else if (it.types.length == 0)
            return `struct ${it.nameType}{}`;
        else
            return `struct ${it.nameType} {\n${it.types[0]}\n}`;
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
        else if (!currentTypeIsObjectOrArray(currentType))
            /* Simples key */
            typeRoot += `\t${resolverNameProperty(keys[key])} ${currentType.view}\n`

        else if (currentTypeIsArray(currentType)) {
            /* Get element by element of array */
            let contentTree = ConstructStrucFromJson(json[keys[key]],
                {
                    ...currentType,
                    nameObj: !Array.isArray(json) ? keys[key] : undefined
                });

            if (contentTree === '')
                contentTree = { code: 'Any' };

            typeRoot += `\t${resolverNameProperty(keys[key])} []${contentTree.code}\n`

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
                typeRoot += `\t${resolverNameProperty(keys[key])} Any\n`
            }
            else
                typeRoot += `\t${resolverNameProperty(keys[key])} ${contentTree.code}\n`
        }
    }



    if (constructStructTypeSimple(hiritageObj))
        typeRoot = {
            code: `struct Root {\n${typeRoot}\n}`,
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
    else if (typesArray.length > 0) {
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


function constructStructTypeSimple(hiritageObj) {
    return hiritageObj === undefined;
}


function constructStructWithArrayOfTypeUndefined(hiritageObj) {
    return hiritageObj !== undefined && hiritageObj.nameObj === 'Undefined';
}

function constructStructWithNewStructAux(hiritageObj) {
    return hiritageObj !== undefined && hiritageObj.nameType === 'object';
}