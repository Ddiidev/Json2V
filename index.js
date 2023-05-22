/**
 * 
 * @param input
 * @returns {{nameType: string, view: string, base: string}}}
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
 * @param {{nameType: string, view: string, nameObj: string} | undefined} typeObj 
 * @returns {{code: string, afterImplementation: string}}
 */
function ConstructStrucFromJson(js, typeObj = undefined) {

    const json = typeof (js) === 'string' ? JSON.parse(js) : js;
    let objRoot = '';
    let typeArray = [];

    if (json === null)
        return { code: null };
    const keys = Object.keys(json)
    for (const key in keys) {
        const currentType = getType(json[keys[key]]);


        if (typeObj !== undefined && typeObj.nameType === 'array') {
            /**
             * into nested array
            */
            if (currentType.nameType === 'object') {
                const content = ConstructStrucFromJson(json[keys[key]],
                    {
                        ...currentType,
                        nameObj: typeObj
                    });

                typeArray.push({
                    ...currentType,
                    view: content.code,
                    nameType: content.code
                });
            } else
                typeArray.push(currentType);

        }
        else if (!['array', 'object'].includes(currentType.nameType))
            /**
             * Simples key
            */
            objRoot += `\t${resolverNameProperty(keys[key])} ${currentType.view}\n`
        else {
            /**
             * Object or Array of key nested
             */
            let content = ConstructStrucFromJson(json[keys[key]],
                {
                    ...currentType,
                    nameObj: !Array.isArray(json) ? keys[key] : undefined
                });

            if (currentType.nameType === 'array') {
                if (content === '')
                    content = { code: 'Any' };
                objRoot += `\t${resolverNameProperty(keys[key])} []${content.code}\n`
            }
            else if (Array.isArray(json)) {
                typeObj = {
                    ...currentType,
                    nameObj: content.code
                }
            }
            else if (content.code === null) {
                pushAfterImplementation({
                    nameType: 'Any',
                    type: 'Any',
                    types: []
                });
                objRoot += `\t${resolverNameProperty(keys[key])} Any\n`
            }
            else
                objRoot += `\t${resolverNameProperty(keys[key])} ${content.code}\n`
        }
    }



    if (typeObj === undefined)
        objRoot = {
            code: `struct Root {\n${objRoot}\n}`,
            afterImplementation: ''
        };
    else if (typeObj !== undefined && typeObj.nameObj === 'Undefined') {
        objRoot = {
            code: `type Root = []${typeObj.nameObj}\n`,
            afterImplementation: ''
        };
    }
    else if (typeObj.nameType === 'object') {

        const name = (() => {
            if (typeObj.nameObj !== undefined && typeObj.nameObj.nameObj !== undefined)
                return resolverNameType(typeObj.nameObj.nameObj);
            else if (typeObj.nameObj !== undefined)
                return resolverNameType(typeObj.nameObj);
            else
                return 'Undefined';
        })();
        pushAfterImplementation({
            nameType: resolverNameType(name),
            types: [objRoot],
            type: typeArray.length > 1 ? 'sumType' : ''
        });

        objRoot = {
            code: name
        };
    }
    else if (typeArray.length > 0) {
        typeArray = _.sortBy(_.sortedUniqBy(typeArray, it => it.nameType), it => it.nameType);

        const typeNumbers = typeArray.filter(it => ['int', 'f32'].includes(it.nameType));
        if (typeNumbers.length > 1) {
            typeArray = typeArray.filter(it => !(['int', 'f32'].includes(it.nameType)));
            typeArray.push(typeNumbers.find(it => it.nameType === 'f32'));
        }

        const name = (() => {
            if (typeArray.length > 1)
                return typeArray.map(x => x.view.capitalize()).join('');
            else
                return typeArray[0].view;
        })();

        if (typeArray.length > 1)
            pushAfterImplementation({
                nameType: name,
                types: typeArray,
                type: typeArray.length > 1 ? 'sumType' : ''
            });

        objRoot = {
            code: name
        };
    }
    return objRoot;
}