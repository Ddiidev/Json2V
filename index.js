
// var app = new Vue({
//     el: '#app',
//     data: {
//         conf: {
//             omitempty: true,
//             enum_to_number: true
//         }
//     },
//     method: {

//     }
// });

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

function JsonToStruct(js, type_obj = undefined) {
    afterImplementation = [];
    let code = ConstructStrucFromJson(js, type_obj).code;

    
    codeAfeterImplementation = afterImplementation.map(it => {
        if (it.type == 'sumType')
            return `type ${it.nameType} = ${it.types.map(it => it.view).join(' | ')}`;
    }).join('\n');


    code += `\n\n${codeAfeterImplementation}`

    return code;
}

/**
 * 
 * @param {string | object} js 
 * @param {{nameType: string, view: string, nameObj: string} | undefined} typeObj 
 * @returns {{code: string, afterImplementation: string}}
 */
function ConstructStrucFromJson(js, typeObj = undefined) {

    json = typeof (js) === 'string' ? JSON.parse(js) : js;
    let objRoot = '';
    let typeArray = [];

    var keys = Object.keys(json)
    for (key in keys) {
        const currentType = getType(json[keys[key]]);


        if (typeObj !== undefined && typeObj.nameType === 'array') {
            /**
             * into nested array
            */

            // if (typeArray.includes(it => it.name_type ===))
            typeArray.push(currentType);

        }
        else if (!['array', 'object'].includes(currentType.nameType))
            /**
             * Simples key
            */
            objRoot += `\t${keys[key]} ${currentType.view}\n`
        else {
            /**
             * Object or Array of key nested
             */
            const content = ConstructStrucFromJson(json[keys[key]],
                {
                    ...currentType,
                    nameObj: keys[key]
                });
            objRoot += `\t${keys[key]} []${content.code}\n`

        }
    }



    if (typeObj === undefined)
        objRoot = {
            code: `struct Root {\n${objRoot}\n}`,
            afterImplementation: ''
        };
    else if (typeArray.length > 0) {

        const typeNumbers = typeArray.filter(it => ['int', 'f32'].includes(it.nameType));
        if (typeNumbers.length > 1) {
            typeArray = typeArray.filter(it => !(['int', 'f32'].includes(it.nameType)));
            typeArray.push(typeNumbers.find(it => it.nameType === 'f32'));
        }

        const name = typeArray.map(x => x.view.capitalize()).join('');


        afterImplementation.push({
            nameType: name,
            types: typeArray,
            type: typeArray.length > 1 ? 'sumType' : 'any'
        });

        objRoot = {
            code: name
        };
    }
    return objRoot;
}