import { ParserRuleRunner, ParserRuleFactory, AParserRule } from "./parser-rules";
import { BaseSyntaxTree, TreeItem } from "./base-tree";
import { ParserDebugItem } from "./base-parser-debug";
import { getMaxListeners } from "cluster";

//===========================================================
//=== TOKEN =================================================
//===========================================================

export const getCorrectedLine = (token: BaseParserToken<any>): number => {
    return token.pos[0] - 1;
};


export interface BaseParserToken<T> {
    pos: [number, number, number];
    type: T;
    value: string;
}


export interface ParserTestResult<S> {
    subject: S;
    newIndex: number;
}


//===========================================================
//=== ERRORS ================================================
//===========================================================


export class ParseError {
    static create(e: Error, position: number, path?: PathItem[]) {
        if (position) {
            (<any>e).position = position;
            e.message = 'Pase Error: ' + e.message + ' at position ' + position;
        }
        return e;
    }
}


export class ParserError {
    static create(e: Error, token: BaseParserToken<any>, path?: PathItem[]) {
        if (token) {
            (<any>e).token = token;
            (<any>e).errormsg = e.message;
            e.message = 'Parse Error: ' + e.message + ' at token ' + JSON.stringify(token) + "\n";
        }
        if (path) {
            let suffix = '';
            path.forEach(item => {
                suffix += '[' + item.name + ' ' + item.pos[0] + ' ' + item.pos[1] + ']';
            });
            e.message += suffix;
        }
        return e;
    }
}


//===========================================================
//=== PARSER ================================================
//===========================================================

export interface PathItem {
    name: string;
    pos: [number, number, number];
}

export class BaseParserFactory<T> {

    public optimizer = new BasBaseSyntaxParserOptimizer();

    protected repository: { [key: string]: AParserRule<T, any> } = {};
    protected mainRules: AParserRule<T, any>[] = [];

    public debug: boolean = false;
    public debugIsComment: boolean = false;

    public debugReport: ParserDebugItem[] = [];

    writeDebug(token: BaseParserToken<T>, severity: 0 | 1 | 2, marker: string, message: string) {
        if (!this.debug) { return; }
        this.debugReport.push([token, marker, message, severity, this.debugIsComment]);
    }
    debugGoInto(token: BaseParserToken<T>, severity: 0 | 1 | 2, marker: string, message: string) {
        if (!this.debug) { return; }
        this.debugReport.push([token, marker, message, severity, this.debugIsComment]);
        this.debugReport.push('enter');
    }
    debugExit() {
        this.debugReport.push('leave');
    }


    protected addRule<S extends TreeItem<T>>(name: string, factory: () => S, callback: (state: ParserRuleRunner<T, S>, result: S) => [TreeItem<T>, number] | false) {
        let rule = new ParserRuleFactory<T, S>(name, factory, callback, this.repository);
        this.repository[name] = rule;
        let result = {
            asMain: () => { this.mainRules.push(rule); return result; },
            acceptComments: (name: string, tokenTypes: T[]) => {
                rule.acceptComments(name, tokenTypes);
            },
        };
        return result;
    }


    public perform(tokens: BaseParserToken<T>[]) {
        this.optimizer = new BasBaseSyntaxParserOptimizer();
        let tree = new BaseSyntaxTree<T>();
        let index = 0;
        while (index < tokens.length) {
            if (this.mainRules.some(rule => {
                let ruleResult = rule.test(this, tokens, index, [], []);
                if (ruleResult) {
                    tree.items.push(ruleResult.subject);
                    index = ruleResult.newIndex;
                    return true;
                }
                return false;
            })) { continue; }

            throw ParserError.create(new Error('unimplemented situation'), tokens[index]);
        }

        return tree;
    }


}

class BasBaseSyntaxParserOptimizer {
    public testSteps = 0;

    public failedRuleCache: { [name: string]: number[] } = {};

    public maxSteps = 0;

    public savedRuleSteps = 0;

    hadAlreadyFailed(rule: AParserRule<any, any>, index: number) {
        if (!this.failedRuleCache[rule.name]) {
            return false;
        }
        return this.failedRuleCache[rule.name].includes(index);
    }

    setFailed(rule: AParserRule<any, any>, index: number) {
        if (!this.failedRuleCache[rule.name]) {
            this.failedRuleCache[rule.name] = [];
        }
        this.failedRuleCache[rule.name].push(index);
    }

}