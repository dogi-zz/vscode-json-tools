import { TreeItemToken, TreeItemNode, TreeItem, BaseSyntaxTree } from "./base-tree";
import { BaseParserToken, getCorrectedLine } from "./base-parser";

const DEBUG = false;

type TokenOrNode<T> = TreeItemToken<T> | TreeItemNode<T>;
type TokenOrTokenItem<T> = BaseParserToken<T> | TreeItemToken<T>;


class ExtendedToken<T> {
    public toLine: number;
    public toPos: number;

    public marginLeft: number = 0;
    public marginRight: number = 0;

    public indent: number | null = null;

    constructor(
        public pos: [number, number, number],
        public type: T,
        public value: string,
    ) {
        this.toLine = pos[0] - 1;
        this.toPos = 0;
    }
}

interface WalkItemTasks {
    indent: boolean;
}

class FormatTokenWalker<T> {
    public lastToken: ExtendedToken<T> | null = null;
    public nextToken: ExtendedToken<T> | null = null;

    public lineOffset = 0;
    constructor(
    ) {
    }

    public moveLine(offset: number) {
        this.lineOffset += offset;
    }

}


class FormatItemWalker<T> {
    public lastToken: ExtendedToken<T> | null = null;
    public lastParentToken: ExtendedToken<T> | null = null;

    public lastItem: TreeItem<T> | null = null;
    public lastParentItem: TreeItem<T> | null = null;

    public lineOffset = 0;

    public baseIndent = 0;
    public actualItem: TreeItem<T> | null = null;
    public actualToken: BaseParserToken<T> | null = null;

    public breakAfterList: BaseParserToken<T>[] = [];
    public breakBeforeList: TreeItemToken<T>[] = [];

    constructor(
    ) {
    }

    public moveLine(offset: number) {
        this.lineOffset += offset;
    }

    public breakAfter(token: TokenOrTokenItem<T>) {
        if (token instanceof TreeItemToken) {
            if (token.token) {
                this.breakAfterList.push(token.token);
            }
        } else {
            this.breakAfterList.push(token);
        }
    }

    public breakBefore(token: TreeItemToken<T>) {
        this.breakBeforeList.push(token);
    }

}

export abstract class BaseFormater<T> {

    private mainTreeItems: TreeItem<T>[] = [];
    private tokens: ExtendedToken<T>[] = [];
    private tokenMap: { [pos: string]: ExtendedToken<T> } = {};

    abstract process(): void;

    protected stringifyToken(type: T, value: string): string {
        return value;
    }

    format(tree: BaseSyntaxTree<T>): string {
        tree.items.forEach(treeItem => {
            this.mainTreeItems.push(treeItem);
            this.collectItems(treeItem);
        });

        this.process();

        if (DEBUG) {
            this.tokens.forEach(t => console.info(JSON.stringify(t)));
        }

        let code = this.printOut();
        return code;
    }

    private collectItems(treeItem: TreeItem<T>) {
        treeItem.content.forEach(contentItem => {
            if (contentItem instanceof TreeItemToken && contentItem.token) {
                let posId = '' + contentItem.token.pos[2];
                let extToken = new ExtendedToken(
                    contentItem.token.pos,
                    contentItem.token.type,
                    contentItem.token.value,
                );
                this.tokens.push(extToken);
                this.tokenMap[posId] = extToken;
            }
            if (contentItem instanceof TreeItemNode && contentItem.item) {
                this.collectItems(contentItem.item);
            }
        });
    }


    // =============================================
    // === WALK ITEMS
    // =============================================    

    protected walkItems(callback: (item: TreeItem<T>, token: BaseParserToken<T> | null, walker: FormatItemWalker<T>) => void): void {
        this.walkItemsWithTask({
            indent: false,
        }, callback);
    }

    protected walkIndent(callback: (item: TreeItem<T>, token: BaseParserToken<T> | null, walker: FormatItemWalker<T>) => void): void {
        this.walkItemsWithTask({
            indent: true,
        }, callback);
    }

    private walkItemsWithTask(tasks: WalkItemTasks, callback: (item: TreeItem<T>, token: BaseParserToken<T> | null, walker: FormatItemWalker<T>) => void): void {
        let walker = new FormatItemWalker<T>();
        this.mainTreeItems.forEach(item => {
            walker.actualItem = item;
            walker.actualToken = item.getFirstToken();

            this.walkItem(tasks, walker, callback);
            walker.lastItem = item;
        });
    }

    private walkItem(tasks: WalkItemTasks, itemWalker: FormatItemWalker<T>, callback: (item: TreeItem<T>, token: BaseParserToken<T> | null, walker: FormatItemWalker<T>) => void): void {
        let item = itemWalker.actualItem;
        if (!item) { return; }
        let token = item.getFirstToken();
        if (!token) { return; }
        let extToken = this.getToken(token);
        callback(item, itemWalker.actualToken, itemWalker);

        // KinderWalker vorbereiten
        let childWalker = new FormatItemWalker<T>();
        childWalker.lineOffset = itemWalker.lineOffset;
        childWalker.baseIndent = itemWalker.baseIndent;
        if (extToken.indent !== null) {
            childWalker.baseIndent = extToken.indent;
        }

        childWalker.lastParentItem = itemWalker.lastItem;
        childWalker.lastParentToken = itemWalker.lastToken;
        childWalker.breakAfterList = itemWalker.breakAfterList;
        childWalker.breakBeforeList = itemWalker.breakBeforeList;

        item.content.forEach((contentItem, idx) => {
            if (contentItem instanceof TreeItemNode && contentItem.item) {
                // für diesen durchlauf vorbereiten
                childWalker.actualItem = contentItem.item;
                childWalker.actualToken = contentItem.item.getFirstToken();

                if (tasks.indent && childWalker.actualToken) {
                    let extToken = this.getToken(childWalker.actualToken);
                    if (extToken.indent !== null) {
                        childWalker.baseIndent = extToken.indent;
                    }
                }

                // durchlauf
                this.walkItem(tasks, childWalker, callback);
                // für nächsten durchlauf vorbereiten
                childWalker.lastItem = contentItem.item;
            }
            if (contentItem instanceof TreeItemToken && contentItem.token) {
                let token = this.getToken(contentItem.token);

                if (childWalker.breakBeforeList.includes(contentItem)) {
                    childWalker.lineOffset++;
                }

                token.toLine += childWalker.lineOffset;
                if (tasks.indent && token.indent === null) {
                    token.indent = itemWalker.baseIndent;
                }

                if (childWalker.breakAfterList.includes(contentItem.token)) {
                    childWalker.lineOffset++;
                }
                childWalker.lastToken = token;
            }
        });

        // neuigkeiten Adaptieren
        itemWalker.lineOffset = childWalker.lineOffset;
        itemWalker.lastToken = childWalker.lastToken;
    }

    public forEachBetween(subject: TreeItem<T>, from: TokenOrNode<T>, to: TokenOrNode<T>, callback: (item: TokenOrNode<T>) => void, inclusive: boolean = false) {
        let fromIndex = subject.content.indexOf(from) + (inclusive ? 0 : 1);
        let toIndex = subject.content.indexOf(to) + (inclusive ? 1 : 0);
        if (fromIndex < 0 || toIndex < 0) { return; }
        subject.content.slice(fromIndex, toIndex).forEach(contentItem => { callback(contentItem); });
    }

    public forEachAfter(subject: TreeItem<T>, from: TokenOrNode<T>, callback: (item: TokenOrNode<T>) => void, inclusive: boolean = false) {
        let fromIndex = subject.content.indexOf(from) + (inclusive ? 0 : 1);
        subject.content.slice(fromIndex).forEach(contentItem => { callback(contentItem); });
    }

    protected addIndent(walker: FormatItemWalker<T>, contentItem: TokenOrNode<T>, indent: number) {
        let aktToken = contentItem.firstToken();
        if (aktToken) {
            this.getToken(aktToken).indent = walker.baseIndent + indent;
        }
    }

    // =============================================
    // === WALK TOKENS
    // =============================================    


    protected walkTokens(callback: (token: BaseParserToken<T>, walker: FormatTokenWalker<T>) => void): void {
        let walker = new FormatTokenWalker<T>();
        let max = this.tokens.length - 1;
        this.tokens.forEach((token, idx) => {
            walker.lastToken = (idx > 0) ? this.tokens[idx - 1] : null;
            walker.nextToken = (idx < max) ? this.tokens[idx + 1] : null;
            callback(token, walker);
            token.toLine += walker.lineOffset;
        });
    }

    // =============================================
    // === HELPER
    // =============================================    


    protected isSameLine(arg1: BaseParserToken<T> | TreeItemToken<T> | null, arg2: TokenOrTokenItem<T> | null): boolean | null {
        if (!arg1 || !arg2) { return null; }
        let arg1t = (arg1 instanceof TreeItemToken) ? arg1.firstToken() : arg1;
        let arg2t = (arg2 instanceof TreeItemToken) ? arg2.firstToken() : arg2;
        if (!arg1t || !arg2t) { return null; }
        return arg1t.pos[0] === arg2t.pos[0];
    }



    // =============================================
    // === PRINT
    // =============================================    

    printOut() {
        let lineContent: { [posId: string]: ExtendedToken<T>[] } = {};
        this.tokens.forEach(token => {
            let lineString = '' + token.toLine;
            if (!lineContent[lineString]) { lineContent[lineString] = []; }
            lineContent[lineString].push(token);
        });

        let printLines: ExtendedToken<T>[][] = [];
        let lineKeys = Object.keys(lineContent).map(k => parseInt(k));
        lineKeys.sort();
        lineKeys.forEach(lineKey => {
            let lineString = '' + lineKey;
            while (lineKey >= printLines.length) {
                printLines.push([]);
            }
            let printLine = printLines[lineKey];
            lineContent[lineString].forEach(token => {
                printLine.push(token);
            });
        });

        let printLineCode: string[] = [];
        printLines.forEach(printLine => {
            let lineCode = '';
            if (!printLine.length) { printLineCode.push(lineCode); return; }
            let firstToken = printLine[0];
            while (firstToken.indent && lineCode.length < firstToken.indent) { lineCode += ' '; }

            printLine.forEach(token => {
                while (lineCode.length < token.toPos) { lineCode += ' '; }
                if (token.marginLeft && !lineCode.match(/^\s*$/)) {
                    let match = lineCode.match(/( +)$/);
                    let spaces = token.marginLeft - (match ? match[1].length : 0);
                    for (let i = 0; i < spaces; i++) { lineCode += ' '; }
                }
                lineCode += this.stringifyToken(token.type, token.value);
                if (token.marginRight) {
                    for (let i = 0; i < token.marginRight; i++) { lineCode += ' '; }
                }
            });
            lineCode += '  ';
            let match = lineCode.match(/^(.*?)\s+$/);
            if (match) { lineCode = match[1]; }
            printLineCode.push(lineCode);
        });
        return printLineCode.join('\n');
    }


    // ======================
    // ==== MODIFICATION ==== 
    // ======================

    public setMarginLeft(token: BaseParserToken<T>, margin: number) {
        this.getToken(token).marginLeft = margin;
    }

    public setMarginRight(token: BaseParserToken<T>, margin: number) {
        this.getToken(token).marginRight = margin;
    }

    // ==============================
    // ==== ITERATION AND GETTER ==== 
    // ==============================

    private getToken(token: BaseParserToken<T>) {
        let posId = '' + token.pos[2];
        return this.tokenMap[posId];
    }

    foreachTokensByName(item: TreeItem<T>, name: string, callback: (token: BaseParserToken<T>) => void) {
        item.content.forEach(ci => {
            if (ci instanceof TreeItemToken && ci.token && ci.name === name) { callback(ci.token); }
        });
    }

    foreachTokenItemsByName(item: TreeItem<T>, name: string, callback: (tokenItem: TreeItemToken<T>) => void) {
        item.content.forEach(ci => {
            if (ci instanceof TreeItemToken && ci.token && ci.name === name) { callback(ci); }
        });
    }

    foreachNodeChildsByName(item: TreeItem<T>, name: string, callback: (tokenItem: TreeItemNode<T>) => void) {
        item.content.forEach(ci => {
            if (ci instanceof TreeItemNode && ci.item && ci.name === name) { callback(ci); }
        });
    }

    foreachTokenItemPairsByName(item: TreeItem<T>, fromTo: [string, string], callback: (from: TreeItemToken<T>, to: TreeItemToken<T>) => void) {
        let [fromName, toName] = fromTo;
        let from: TreeItemToken<T> | null = null;
        item.content.forEach(ci => {
            if (ci instanceof TreeItemToken && ci.token && ci.name === fromName) {
                from = ci;
            }
            if (ci instanceof TreeItemToken && ci.token && ci.name === toName && from !== null) {
                callback(from, ci);
                from = null;
            }
        });
    }


    // foreachItemsByName(item: TreeItem<T>, name: string, callback: (item: TreeItem<T>) => void) {
    //     item.content.forEach(ci => {
    //         if (ci instanceof TreeItemNode && ci.item && ci.name === name) { callback(ci.item); }
    //     });
    // }
    // foreachChildsByName(item: TreeItem<T>, name: string, callback: (item:TokenOrNode<T>) => void) {
    //     item.content.forEach(ci => {
    //         if (ci instanceof TreeItemNode && ci.item && ci.name === name) { callback(ci); }
    //         if (ci instanceof TreeItemToken && ci.token && ci.name === name) { callback(ci); }
    //     });
    // }
    // nextChildByName(item: TreeItem<T>, from:TokenOrNode<T>, name: string, callback: (item:TokenOrNode<T>) => void) {
    //     item.content.slice(item.content.indexOf(from) + 1).some(ci => {
    //         if (ci instanceof TreeItemNode && ci.item && ci.name === name) { callback(ci); return true; }
    //         if (ci instanceof TreeItemToken && ci.token && ci.name === name) { callback(ci); return true; }
    //         return false;
    //     });
    // }

    // tokenPairs(item: TreeItem<T>, callback: (t1: BaseParserToken<T>, t2: BaseParserToken<T>, p1: [number, number], p2: [number, number]) => void) {
    //     for (let i = 0; i < item.content.length - 1; i++) {
    //         let token1 = item.content[i].lastToken();
    //         let token2 = item.content[i + 1].firstToken();
    //         if (token1 && token2) { callback(token1, token2, this.tokenPositions[token1.pos[2]], this.tokenPositions[token2.pos[2]]); }
    //     }
    // }

    // =============================================
    // === CONVENIENCE
    // =============================================    

    protected addIndentBetween(item: TreeItem<T>, walker: FormatItemWalker<T>, fromToSupplier: () => [TreeItemToken<T>, TreeItemToken<T>], indent: number) {
        let [from, to] = fromToSupplier();
        this.forEachBetween(item, from, to, contentItem => {
            if (!this.isSameLine(from, to)) {
                this.addIndent(walker, contentItem, indent);
            }
        });
    }

    protected addIndentAfter(item: TreeItem<T>, walker: FormatItemWalker<T>, fromSupplier: () => [TreeItemToken<T>], indent: number) {
        let [from] = fromSupplier();
        this.forEachAfter(item, from, contentItem => {
            if (!this.isSameLine(from, contentItem.firstToken())) {
                this.addIndent(walker, contentItem, indent);
            }
        });
    }

    protected breakAfter(item: TreeItem<T>, walker: FormatItemWalker<T>, token: TokenOrTokenItem<T>) {
        if (token instanceof TreeItemToken) {
            if (!token.token) { return; }
            token = token.token;
        }
        let tokenIndex = this.getLastTokenItemIndex(item.content, token);
        if (tokenIndex + 1 < item.content.length) {
            let nextItem = item.content[tokenIndex + 1];
            if (this.isSameLine(token, nextItem.firstToken())) {
                walker.breakAfter(token);
            }
        }
    }

    private getLastTokenItemIndex(content: TokenOrNode<T>[], token: BaseParserToken<T>): number {
        let index = -1;
        content.forEach((ci, idx) => {
            if (ci.lastToken() === token) {
                index = idx;
            }
        });
        return index;
    }

    protected breakBefore(item: TreeItem<T>, walker: FormatItemWalker<T>, token: TreeItemToken<T>) {
        let tokenIndex = item.content.indexOf(token);
        if (tokenIndex > 0) {
            let prevItem = item.content[tokenIndex - 1];
            if (this.isSameLine(token.firstToken(), prevItem.firstToken())) {
                walker.breakBefore(token);
            }
        }
    }

    protected breakEnvirentmentedTokens(item: TreeItem<T>, walker: FormatItemWalker<T>, supplier: () => [TreeItemToken<T>, TreeItemToken<T>, string]) {
        let [start, end, seperatorName] = supplier();
        if (!this.isSameLine(start, end)) {
            this.breakAfter(item, walker, start);
            this.foreachTokenItemsByName(item, seperatorName, ti => {
                this.breakAfter(item, walker, ti);
            });
            this.breakBefore(item, walker, end);
        }
    }

    protected breakEnvirentmentedNodes(item: TreeItem<T>, walker: FormatItemWalker<T>, supplier: () => [TreeItemToken<T>, TreeItemToken<T>, string]) {
        let [start, end, seperatorName] = supplier();
        if (!this.isSameLine(start, end)) {
            this.breakAfter(item, walker, start);
            this.foreachNodeChildsByName(item, seperatorName, ti => {
                let lastToken = ti.lastToken();
                if (lastToken) {
                    this.breakAfter(item, walker, lastToken);
                }

            });
            this.breakBefore(item, walker, end);
        }
    }

}




