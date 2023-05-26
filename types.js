var RESERVED_WORDS = [
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