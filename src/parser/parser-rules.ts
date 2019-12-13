import { BaseParserToken, ParserError, PathItem, ParserTestResult, BaseParserFactory } from "./base-parser";
import { TreeItem } from "./base-tree";


export abstract class AParserRule<T, S extends TreeItem<T>> {
    constructor(
        public name: string,
    ) {

    }
    abstract test(parser: BaseParserFactory<T>, tokens: BaseParserToken<T>[], index: number, args: any[], path: PathItem[]): ParserTestResult<S> | false;
}


export class ParserRuleRunner<T, S extends TreeItem<T>>  {
    throwError = false;
    constructor(
        public factory: ParserRuleFactory<T, S>,
        public parser: BaseParserFactory<T>,
        public tokens: BaseParserToken<T>[],
        public index: number,
        public startIndex: number,
        public path: PathItem[],
        public subject: S,
    ) { }

    public activateError() {
        this.throwError = true;
    }

    public getToken() {
        return this.tokens[this.index];
    }

    public error(message: string) {
        throw ParserError.create(new Error(message), this.tokens[this.index], this.path);
    }

    public expectToken(
        type: T | T[],
        value: string | string[] | null,
        action: (token: BaseParserToken<T>) => void,
        comments?: [string, T][],
    ) {
        return this.checkToken('check', this.throwError, this.subject, type, value, (i, t) => { this.index = i; action(t); }, comments ? comments : this.factory.comments);
    }


    public testToken(
        type: T | T[],
        value: string | string[] | null,
        comments?: [string, T][],
    ) {
        return this.checkToken('test', false, null, type, value, (i, t) => { }, comments ? comments : this.factory.comments);
    }

    public testTokens(
        checks: [T, string | string[] | null][],
    ) {
        let startIndex = this.index;
        let result = true;
        checks.forEach(check => {
            if (check[1] && !Array.isArray(check[1])) {
                check[1] = [check[1]];
            }
            if (!this.checkToken('test', false, null, [check[0]], check[1], (i, t) => { this.index = i; }, this.factory.comments)) {
                result = false;
            }
        });
        this.index = startIndex;
        return result;
    }

    public expectRule(
        ruleName: string,
        action: (token: TreeItem<T>) => void,
    ): boolean {

        let rule = this.factory.repository[ruleName];
        if (!rule) { throw new Error("Parser Rule Not Found: " + ruleName); }

        if (this.index >= this.tokens.length) { return false; }
        let ruleResult = rule.test(this.parser, this.tokens, this.index, [], this.path);

        if (ruleResult) {
            this.index = ruleResult.newIndex;
            action(ruleResult.subject);
            return true;
        }

        if (this.throwError) {
            let startToken = this.tokens[this.startIndex];
            let errorString = 'expected: ' + ruleName;
            let atString = ' parsing "' + this.factory.name + '" [' + startToken.pos[0] + ',' + startToken.pos[1] + ']';
            throw ParserError.create(new Error(errorString + atString), this.tokens[this.index], this.path);
        }

        return false;

    }


    checkToken(
        logtext: string,
        throwError: boolean,
        subject: TreeItem<T> | null,
        type: T | T[],
        value: string | string[] | null,
        action: (index: number, token: BaseParserToken<T>) => void,
        comments: [string, T][],
    ): boolean {
        let types = Array.isArray(type) ? type : [type];
        let values = value ? (Array.isArray(value) ? value : [value]) : null;
        this.parser.writeDebug(this.getToken(), 0, logtext + '.....', type + ' ' + value);

        this.parser.debugIsComment = true;
        let index = this.testForComments(this.index, subject, comments);
        this.parser.debugIsComment = false;

        if (index >= this.tokens.length) { return false; }
        if (types.includes(this.tokens[index].type)) {
            if (!values || values.includes(this.tokens[index].value)) {
                let result = this.tokens[index];
                action(index + 1, result);
                this.parser.writeDebug(this.getToken(), 1, logtext + '...ok', type + ' ' + value);
                return true;
            }
        }
        this.parser.writeDebug(this.getToken(), 2, logtext + '...no', type + ' ' + value);

        if (throwError) {
            let startToken = this.tokens[this.startIndex];
            let errorString = 'expected: ' + types + (values ? (' ' + values) : '');
            let atString = ' parsing "' + this.factory.name + '" [' + startToken.pos[0] + ',' + startToken.pos[1] + ']';
            throw ParserError.create(new Error(errorString + atString), this.tokens[this.index], this.path);
        }

        return false;
    }

    private testForComments(index: number, subject: TreeItem<T> | null, comments: [string, T][]): number {
        while (comments.some(commentDef => {
            if (index >= this.tokens.length) { return false; }
            if (this.tokens[index].type === commentDef[1]) {
                if (subject) {
                    subject.addNamedToken(commentDef[0], this.tokens[index]);
                }
                index++;
                return true;
            }
            return false;
        })) {
            // Comment Found
        }
        return index;
    }


}


export class ParserRuleFactory<T, S extends TreeItem<T>> extends AParserRule<T, TreeItem<T>>{

    public comments: [string, T][] = [];

    constructor(
        name: string,
        private factory: () => S,
        private callback: (state: ParserRuleRunner<T, S>, result: S) => [TreeItem<T>, number] | false,
        public repository: { [key: string]: AParserRule<T, any> },
    ) {
        super(name);
    }

    test(parser: BaseParserFactory<T>, tokens: BaseParserToken<T>[], index: number, args: any[], path: PathItem[]): ParserTestResult<TreeItem<T>> | false {
        let startIndex = index;
        parser.debugGoInto(tokens[index], 0, 'Start rule ', this.name);

        path = path.concat([{ name: this.name, pos: tokens[index].pos }]);


        let result = this.factory();
        let state: ParserRuleRunner<T, S> = new ParserRuleRunner<T, S>(
            this,
            parser,
            tokens,
            index,
            startIndex,
            path,
            result
        );

        let cbResult = this.callback(state, result);

        let ruleResult = cbResult ? {
            subject: cbResult[0],
            newIndex: cbResult[1],
        } : false;

        parser.debugExit();
        if (cbResult) {
            parser.writeDebug(tokens[index], 1, 'Success rule ', this.name);
        } else {
            parser.writeDebug(tokens[index], 2, 'Failed rule ', this.name);
        }
        return ruleResult;
    }

    acceptComments(name: string, tokenTypes: T[]) {
        tokenTypes.forEach(type => {
            this.comments.push([name, type]);
        });
    }


}




