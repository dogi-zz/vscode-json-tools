import { BaseParserToken } from "./base-parser";
import { ParserDebugItem } from "./base-parser-debug";

export class BaseSyntaxTree<T> {

    items: TreeItem<T>[] = [];

    constructor() { }

    print() {
        console.info("---- SYNTAX TREE ----");
        this.items.forEach(item => {
            item.print(' - ');
        });
        console.info("---- ----------- ----");
    }


    getDebugReport(): ParserDebugItem[] {
        let result: ParserDebugItem[] = [];
        this.items.forEach(item => {
            this.report(null, item, result, item.comment);
        });

        return result;
    }

    private report(prefix: string | null, item: TreeItem<T>, result: ParserDebugItem[], comment: boolean): void {
        result.push([item.getFirstToken(), prefix ? prefix : '', item.constructor.name, 0, comment]);
        result.push('enter');
        let content = item.content;
        content.forEach(contentItem => {
            if (contentItem instanceof TreeItemToken) {
                result.push([contentItem.token, '', '<i>' + contentItem.name + '</i>', 0, comment]);
            }
            if (contentItem instanceof TreeItemNode) {
                if (contentItem.item) {
                    this.report(contentItem.name, contentItem.item, result, comment || contentItem.item.comment);
                }
            }
        });
        result.push('leave');
    }

}



export abstract class TreeItem<T> {
    comment: boolean = false;

    content: (TreeItemToken<T> | TreeItemNode<T>)[] = [];

    constructor(
    ) {

    }

    addUnnamedNode(node: TreeItem<T>) {
        let newItem = new TreeItemNode(this, '.');
        newItem.set(node);
    }

    addUnnamedToken(token: BaseParserToken<T>) {
        let newItem = new TreeItemToken(this, '.');
        newItem.set(token);
    }

    addNamedNode(name: string, node: TreeItem<T>) {
        let newItem = new TreeItemNode(this, name);
        newItem.set(node);
    }

    addNamedToken(name: string, token: BaseParserToken<T>) {
        let newItem = new TreeItemToken(this, name);
        newItem.set(token);
    }

    getFirstToken(): BaseParserToken<T> | null {
        if (!this.content || !this.content.length) {
            return null;
        }
        let first = this.content[0];
        if (first instanceof TreeItemToken) {
            return first.token;
        }
        if (first instanceof TreeItemNode && first.item) {
            return first.item.getFirstToken();
        }
        return null;
    }

    getLastToken(): BaseParserToken<T> | null {
        if (!this.content || !this.content.length) {
            return null;
        }
        let last = this.content[this.content.length - 1];
        if (last instanceof TreeItemToken) {
            return last.token;
        }
        if (last instanceof TreeItemNode && last.item) {
            return last.item.getLastToken();
        }
        return null;
    }

    nextByName(from: TreeItemToken<T> | TreeItemNode<T>, name: string): TreeItemToken<T> | TreeItemNode<T> | null {
        let idx = this.content.indexOf(from);
        for (let i = idx + 1; i < this.content.length; i++) {
            if (this.content[i].name === name) { return this.content[i]; }
        }
        return null;
    }

    print(prefix: string): void {
        let spacePrefix = prefix.replace(/./g, ' ');

        console.info(prefix + '[' + this.constructor.name + ']');

        let maxNameLen = 0;
        this.content.forEach((item, idx) => {
            if (item.name) {
                maxNameLen = Math.max(maxNameLen, item.name.length);
            }
        });

        this.content.forEach((item) => {
            if (item instanceof TreeItemToken) {
                let nameString: string = item.name;
                let tokenString = (item.token === null) ? 'null' : JSON.stringify(item.token);
                while (nameString.length < maxNameLen) { nameString += ' '; }
                console.info(spacePrefix + '..' + nameString + ': ' + tokenString);
            }
            if (item instanceof TreeItemNode) {
                let nameString: string = item.name;
                while (nameString.length < maxNameLen) { nameString += ' '; }
                console.info(spacePrefix + '..' + nameString + ': ');
                (<TreeItem<T>>item.item).print(spacePrefix + '  - ');
            }
        });
    }

}

export class TreeItemToken<T> {
    public token: BaseParserToken<T> | null = null;
    constructor(private parent: TreeItem<T>, public name: string) {
    }
    set(token: BaseParserToken<T>) {
        if (this.token) { throw new Error("cannot reassign token value!"); }
        this.parent.content.push(this);
        this.token = token;
    }
    firstToken(): BaseParserToken<T> | null {
        return this.token;
    }
    lastToken(): BaseParserToken<T> | null {
        return this.token;
    }
}

export class TreeItemNode<T> {
    public item: TreeItem<T> | null = null;
    private _first_token: BaseParserToken<T> | null = null;
    private _last_token: BaseParserToken<T> | null = null;
    constructor(private parent: TreeItem<T>, public name: string) {
    }
    set(item: TreeItem<T>) {
        if (this.item) { throw new Error("cannot reassign node value!"); }
        this.parent.content.push(this);
        this.item = item;
    }
    firstToken(): BaseParserToken<T> | null {
        if (!this._first_token) {
            this._first_token = this.item ? this.item.getFirstToken() : null;
        }
        return this._first_token;
    }
    lastToken(): BaseParserToken<T> | null {
        if (!this._last_token) {
            this._last_token = this.item ? this.item.getLastToken() : null;
        }
        return this._last_token;
    }

}
