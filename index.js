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

    editorJson.setValue('{\n\t"_example_construct_struct": "",\n\t"person": {\n\t\t"name": "André",\n\t\t"age": 26\n\t}\n}');
    loadFlags();
}



function runCode() {
    try {
        const code = JsonToStruct(editorJson.getValue())

        if (code === null)
            return;

        editorVlang.setValue(code);
    } catch (e) {
        console.log(e)
    }
}

var FlagOmitEmpty = true;
var FlagReserverdWordsWithAt = false;
var FlagStructAnon = false;
function loadFlags() {
    FlagOmitEmpty = document.getElementById('ck_omitempty').checked;
    FlagReserverdWordsWithAt = document.getElementById('ck_reserved_word').checked;
    FlagStructAnon = document.getElementById('ck_struct_anon').checked;
    runCode();
}


String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.substr(1);
}


function pushAfterImplementationType(type) {
    if (afterImplementationTypes.find(it => it.nameType === type.nameType) === undefined)
        afterImplementationTypes.push(type);
}


/**
 * @description Add a new type to the list of types to be implemented and convert the json to struct
 */
function JsonToStruct(js, type_obj = undefined) {
    afterImplementationTypes = [];
    let code = ConstructStrucFromJson(js, type_obj).code;

    if (code === null)
        return null;

    codeAfeterImplementation = afterImplementationTypes.map(it => {
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

        if (!FlagStructAnon) {
            pushAfterImplementationType({
                nameType: resolverNameType(name),
                types: [typeRoot],
                type: typesArray.length > 1 ? 'sumType' : ''
            });
        }

        typeRoot = {
            code: !FlagStructAnon ? name : `struct {\n${typeRoot.replaceAll('\t', '\t\t')}\t}`,
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
