const A = new arKsecond;

const upperOrLowerStr = s => A.choice([
    A.str(s.toLowerCase()),
    A.str(s.toUpperCase)
])

const asType = type => value => ({type: type, value: value})

const register = A.choice([
    upperOrLowerStr('acc'),
    upperOrLowerStr('ip'),
    upperOrLowerStr('x'),
    upperOrLowerStr('y'),
    upperOrLowerStr('d'),
    upperOrLowerStr('r3'),
    upperOrLowerStr('r4'),
    upperOrLowerStr('r5'),
    upperOrLowerStr('r6'),
    upperOrLowerStr('r7'),
    upperOrLowerStr('sp'),
    upperOrLowerStr('fp')
]).map(asType('REGISTER'))

const hexDigit = A.regex(/^[0-9a-fA-F]+/);
const hexPrefix = A.char('$')
const hexLiteral = A.sequenceOf([hexPrefix, hexDigit]).map(asType('HEX_LITERAL'))