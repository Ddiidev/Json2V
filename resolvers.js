/**
 * @description Sets the property name to a suitable name in the V language standard
 * @param {string} name
 * @returns {{ name: string, replaceName: string }}
 * */
function resolverNameProperty(name) {

    let final_name = '';
    for (let i = 0; i < name.length; i++) {
        const char = name[i];
        if (char === char.toUpperCase() && !Number.isInteger(parseInt(char)))
            final_name += `_${char.toLowerCase()}`;
        else
            final_name += char;
    }
    final_name = final_name.charAt(0) == '_' ? final_name.substr(1) : final_name;
    final_name = final_name.normalize('NFD').replace(/[^a-zA-Z0-9_]|[\u0300-\u036f]/g, '').replace(/_{2,}/g, '_');

    let currentReservedWord = RESERVED_WORDS.includes(final_name);
    if (currentReservedWord && FlagReserverdWordsWithAt)
        final_name = `@${final_name}`;
    else if (currentReservedWord)
        final_name = `${final_name}_`;

    const replaceName = final_name !== name && !(currentReservedWord && FlagReserverdWordsWithAt) ? `json: "${name}"` : '';

    return { name: final_name, replaceName: replaceName };
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
        attribs.push('omitempty');

    if (attribs.length === 0)
        return '';
    else if (attribs.length === 1)
        return `@[${attribs.join('')}]`;

    return `@[${attribs.join('; ')}]`;
}