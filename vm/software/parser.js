class Tokenizer {
    static sanitize(text) {
        var noComments = '';
        for (var line of text.split('\n')) { 
            if (!line.startsWith('//')) noComments += line;
        }

        var sanitized = [];
        for (var line of noComments.split(/[;:]/)) {
            line = line.trim();

            if (line != '') sanitized.push(line)
        };

        return sanitized
    }

    static classify(line) {
        if (line.length == 1) return 'LABEL'

        var keyword = line[0];

        const keywordLookup = {
            '.org': 'ORG',
            '.def': 'DEF',
            '.global': 'GLOBAL_DEF',
            '.global_label': 'GLOBAL_LABEL',
            '.data16': 'DATA16',
            '.data8': 'DATA8',
            '.global_data16': 'GLOBAL_DATA16',
            '.global_data8': 'GLOBAL_DATA8'
        }

        var category = keywordLookup[keyword];

        return category != null ? category : line[line.length - 1] == ':' ? 'LABEL' : 'INSTRUCTION'
    }

    static classifyArgument(word) {
        var prefix = word.slice(0, 1)
        var prefixDict = {
            '!': 'VARIABLE',
            '(': 'EXPRESSION_PARENTHESIS',
            '{': 'DATA_BRACKET',
            '[': 'ADDRESS_BRACKET',
        }

        if (prefixDict[prefix] != null) return prefixDict[prefix]

        const isOnlyValidChars = (word, chars) => {
            for (var char of word) {
                if (!chars.includes(char)) return false
            }
            return true
        }

        if (prefix == '\'' && word.length == 2) return 'CHR_LITERAL'
        if (prefix == '$' && isOnlyValidChars(word.slice(1), '0123456789abcdefABCDEF')) return 'HEX_LITERAL'
        if (prefix == 'b' && isOnlyValidChars(word.slice(1), '01')) return 'BIN_LITERAL'
        if (prefix == '&' && registerNames.includes(word.slice(1))) return 'INDIRECT_REGISTER'

        if (registerNames.includes(word)) return 'REGISTER'


        if (isOnlyValidChars(word, '0123456789')) return 'DEC_LITERAL';

        return 'LABEL'
    }

    static findClosing(char, args) {
        for (var i = 1; i < args.length; i++) {
            if (args[i] == char) return i;

            if (args[i] == {
                    ')': '(',
                    '}': '{',
                    ']': '['
                } [char]) i += Tokenizer.findClosing(char, args.slice(i)) + 1
        }

        return -1;
    }

    static parseExpression = (args) => {
        const operators = '+-*/&|^'
        var output = []
        var expression = ''
        for (var i in args) {
            if (operators.includes(args[i])) {
                output.push(!isNaN(parseInt(expression)) ? new Token('LITERAL', parseInt(expression)) : new Token('VARIABLE', expression))
                output.push(args[i])
                expression = ''
            } else {
                expression += args[i]
            }
        }

        output.push(!isNaN(parseInt(expression)) ? new Token('LITERAL', parseInt(expression)) : new Token('VARIABLE', expression))
        return output
    }
    
    static createExpression(args) {
        const operators = '+-*/&|^'

        if (args.length == 1) return new Token('EXPRESSION', args[0])

        try {
            for (var i = 1; i < args.length; i++) {
                var currentOperation = args[i]
                if (!operators.includes(currentOperation)) throw new Error('bad expression')

                var a = args[i - 1]
                var b = args[i + 1]

                args.splice(i - 1, 2)
                console.log(args)
                i--;

                args[i] = new Token('OPERATION', currentOperation, [a, b])
            }
        } catch (err) {
            throw new Error(`ERROR PARSING EXPRESSION ${args.map(x=>JSON.stringify(x, null, '    ')).join('\n')}`)
        }
        return Tokenizer.createExpression(args)
    }

    static parseArgs(args) {
        if (args.length == 0) return [];

        var parsed = [];
        for (var i = 0; i < args.length; i++) {
            var arg = args[i]
            var type = Tokenizer.classifyArgument(arg)
            switch (type) {
                case ('REGISTER'):
                    parsed.push(new Token('REGISTER', arg))
                    break;
                case ('INDIRECT_REGISTER'):
                    parsed.push(new Token('INDIRECT_REGISTER', arg.slice(1)))
                    break;
                case ('HEX_LITERAL'):
                    parsed.push(new Token('LITERAL', parseInt(arg.slice(1), 16)))
                    break;
                case ('BIN_LITERAL'):
                    parsed.push(new Token('LITERAL', parseInt(arg.slice(1), 2)))
                    break;
                case ('DEC_LITERAL'):
                    parsed.push(new Token('LITERAL', parseInt(arg, 10)))
                    break;
                case ('CHR_LITERAL'):
                    parsed.push(new Token('LITERAL', arg.charCodeAt(1)))
                    break;
                case ('ADDRESS_BRACKET'):
                    var closing = Tokenizer.findClosing(']', arg.split(''))
                    parsed.push(new Token('ADDRESS', Tokenizer.createExpression(Tokenizer.parseExpression(arg.slice(1, closing)))))
                    break;
                case ('EXPRESSION_PARENTHESES'):
                    var closing = Tokenizer.findClosing(')', arg.split(''))
                    parsed.push(new Token('EXPRESSION', Tokenizer.createExpression(Tokenizer.parseExpression(arg.slice(1, closing)))))
                    break;
                case ('DATA_BRACKET'):
                    var data = args.join('').slice(1, -1).split(',')
                    parsed.push(new Token('DATA', data.length, Tokenizer.parseArgs(data)))
                    break;
                default:
                    parsed.push(new Token(type, arg))
                    break;
            }
        }
        //console.log(parsed.map(x=>JSON.stringify(x, null, '    ')).join('\n'))
        return parsed
    }

    static parse(line) {
        line = line.split(/[\s]+/)

        line = [line[0], ...line.slice(1).join('').split(',')]

        var type = Tokenizer.classify(line)
        switch (type) { 
            case 'LABEL':
            case 'GLOBAL_LABEL':
                return new Token(type, line[1])
            case 'DEF':
            case 'GLOBAL_DEF':
            case 'DATA16':
            case 'DATA8':
            case 'GLOBAL_DATA16':
            case 'GLOBAL_DATA8':
                return new Token(type, line[1], Tokenizer.parseArgs(line.slice(2)))
            default:
                return new Token(type, line[0], Tokenizer.parseArgs(line.slice(1)))
        }
    }

    static read(text) {
        var sanitized = Tokenizer.sanitize(text)
        //console.log(sanitized.join('\n'))
        var tokenized = [];

        for (var command of sanitized) {
            tokenized.push(Tokenizer.parse(command))
        }

        console.log(tokenized.map(x=>JSON.stringify(x, null, '    ')).join('\n\n'))
        return tokenized
    }
}

class Token {
    constructor(type, value, args = []) {
        this.type = type
        this.value = value
        this.args = args
    }
}