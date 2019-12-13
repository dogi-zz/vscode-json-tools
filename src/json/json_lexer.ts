import { BaseLexer } from "../parser/base-lexer";


const BRACES = ['{', '}', '[', ']'];
const SYMBOLS = [':', ','];
const KEYWORDS = ['null', 'true', 'false'];


export type JsonTokenType = 'KEYWORD' | 'BOOLEAN' | 'NUMBER' | 'STRING' | 'BRACE' | 'SYMBOL';


export class JsonLexer extends BaseLexer<JsonTokenType> {

    prepareNextRuleTest() {
        while (this.hasChar() && this.char().match(/\s/)) {
            this.skip(1);
        }
    }

    initRules() {

        // keyword
        this.addRule(() => this.startsWithOneOf(KEYWORDS) ? true : false, () => {
            let keyword = <string>this.startsWithOneOf(KEYWORDS);
            return this.createToken('KEYWORD', keyword.length);
        });

        // number
        this.addRule(() => this.startReg(/[0-9\-]/, 1) ? true : false, () => {
            let end = this.findUntil(string => {
                if (string.match(/^\-?\d*\.?\d*[eE]?\-?\d*$/)) { return true; }
                return false;
            });
            return this.createToken('NUMBER', end);
        });

        // string
        this.addRule(() => this.startsWith('"'), () => {
            let end = this.findCharwiseUntil(1, 1, (char, done) => {
                if (char === '\\') { return 2; }
                if (char === '"') { done(); }
                return 1;
            }, true);
            return this.createToken('STRING', end);
        });

        // braces
        this.addRule(() => this.startsWithOneOf(BRACES) ? true : false, () => {
            let prefix = <string>this.startsWithOneOf(BRACES);
            return this.createToken('BRACE', prefix.length);
        });

        // symbols
        this.addRule(() => this.startsWithOneOf(SYMBOLS) ? true : false, () => {
            let prefix = <string>this.startsWithOneOf(SYMBOLS);
            return this.createToken('SYMBOL', prefix.length);
        });

    }


}
