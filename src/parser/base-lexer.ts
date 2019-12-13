import { BaseParserToken, ParseError } from "./base-parser";

//===========================================================
//=== LEXER =================================================
//===========================================================



interface LexerRule {
    test: () => boolean;
    perform: () => boolean;
}



export abstract class BaseLexer<T> {

    protected tokens: BaseParserToken<T>[] = [];
    protected index = 0;

    private lineStarts: number[] = [];

    private rules: LexerRule[] = [];

    constructor(protected code: string) {
        let pos = 0;
        code.split('\n').forEach(line => {
            this.lineStarts.push(pos);
            pos += line.length + '\n'.length;
        });
    }

    abstract prepareNextRuleTest(): void;

    abstract initRules(): void;

    protected addRule(test: () => boolean, perform: () => boolean) {
        this.rules.push({
            test: test,
            perform: perform,
        });
    }


    parse() {
        this.rules = [];
        this.initRules();

        this.tokens = [];
        while (!this.isFinished()) {
            this.next(this.rules);
        }
        return this.tokens;
    }

    next(rules: LexerRule[]) {

        this.prepareNextRuleTest();
        if (!this.hasChar()) {
            return;
        }

        if (rules.some(rule => rule.test() && rule.perform())) {
            return;
        }

        throw ParseError.create(new Error("unknown character '" + this.code[this.index] + "'"), this.index);
    }

    protected isFinished() {
        return this.index >= this.code.length;
    }
    protected char() {
        return this.code[this.index];
    }
    protected substring(len = -1) {
        let index = this.index;
        if (len < 0) { return this.code.substr(index); }
        return this.code.substr(index, len);
    }
    protected hasChar() {
        return this.index < this.code.length;
    }


    protected indexOf(search: string, withError = false): number {
        let idx = this.code.indexOf(search, this.index);
        if (idx < 0) {
            if (withError) {
                throw ParseError.create(new Error("no +'" + search + "' found after position"), this.index);
            }
            return -1;
        }
        return idx - this.index;
    }
    protected lenUntil(search: string, withError = false): number {
        let idx = this.indexOf(search, withError);
        return idx < 0 ? idx : (idx + search.length);
    }

    protected findCharwiseUntil(offset: number, len: number, cb: (char: string, done: () => void) => number, withError = false): number {
        let end = this.index + offset;
        while (end < this.code.length) {
            let done = false;
            let skipChars = cb(this.code.substr(end, len), () => done = true);
            if (skipChars < 0) {
                break;
            }
            end += skipChars;
            if (done) {
                return end - this.index;
            }
        }
        if (withError) {
            throw ParseError.create(new Error("no end found after position"), this.index);
        }
        return -1;
    }

    protected findUntil(cb: (char: string) => boolean, withError = false): number {
        let end = 0;
        while (this.index + end < this.code.length) {
            if (cb(this.substring(end + 1))) {
                end += 1;
            } else {
                break;
            }
        }
        return end;
    }



    protected startsWith(prefix: string) {
        for (let i = 0; i < prefix.length; i++) {
            if (this.isFinished()) { return false; }
            if (this.code[this.index + i] !== prefix[i]) { return false; }
        }
        return true;
    }

    protected startsWithOneOf(prefixes: string[], skip = false): string | false {
        for (let i = 0; i < prefixes.length; i++) {
            if (this.startsWith(prefixes[i])) {
                if (skip) {
                    this.skip(prefixes[i].length);
                }
                return prefixes[i];
            }
        }
        return false;
    }

    protected startReg(match: RegExp, lookup: number): RegExpMatchArray | null {
        return this.code.substr(this.index, lookup).match(match);
    }



    protected skip(count: number) {
        this.index += count;
    }

    protected createToken(type: T, len: number, value: string | null = null) {
        if (value === null) {
            value = this.substring(len);
        }
        this.tokens.push({
            pos: this.getPosFromIndex(this.index),
            type: type,
            value: value,
        });
        this.index = (len < 0) ? this.code.length : (this.index + len);
        return true;
    }

    getPosFromIndex(index: number): [number, number, number] {
        let line = 0;
        while (line < this.lineStarts.length && index >= this.lineStarts[line]) { line++; }
        return [line, index - this.lineStarts[line - 1] + 1, index];
    }

}

