import * as vscode from 'vscode';
import { JsonLexer, JsonTokenType } from '../json/json_lexer';
import { JsonSyntaxParserFactory } from '../json/json_parser';
import { JsonFormater } from '../json/json_formater';
import { JsonSyntaxTree, JsonTreeItemNode, JsonNode, JsonTreeItemToken } from '../json/json_types';
import { TreeItemNode, TreeItemToken, TreeItem } from '../parser/base-tree';
import { BaseParserToken } from '../parser/base-parser';

export class JsonExtension {



    public checkErrors(code: string, callback: (from: vscode.Position, to: vscode.Position, error: string) => void) {
        let lexer = new JsonLexer(code);
        let parser = new JsonSyntaxParserFactory();

        try {
            let tokens = lexer.parse();
            parser.perform(tokens);
        } catch (e) {
            if (e.token) {
                let positionFrom = new vscode.Position(e.token.pos[0], e.token.pos[0]);
                let positionTo = this.positionPlus(positionFrom, e.token.value.length);
                callback(positionFrom, positionTo, e.errormsg);
            } else if (e.position) {
                let positionFrom = this.getPosition(code.split('\n'), e.position);
                let positionTo = this.positionPlus(positionFrom, 1);
                callback(positionFrom, positionTo, e.message);
            }
        }
    }

    parse(code: string): JsonSyntaxTree {
        let lexer = new JsonLexer(code);
        let tokens = lexer.parse();
        let parser = new JsonSyntaxParserFactory();
        let tree = parser.perform(tokens);
        return tree;
    }

    squishAt(start: vscode.Position, tokens: JsonSyntaxTree) {
        let item = this.findItemAt(start, tokens);
        if (item) {
            this.squishItem(tokens, item);

            let formatetCode = new JsonFormater().format(tokens);
            return formatetCode;
        }
        return null;
    }

    format(tree: JsonSyntaxTree) {
        let formatetCode = new JsonFormater().format(tree);
        return formatetCode;
    }

    private squishItem(tokens: JsonSyntaxTree, item: TreeItem<JsonTokenType>) {
        let first = item.getFirstToken();
        let last = item.getLastToken();
        if (first && last) {
            let firstLine = first.pos[0];
            let lastLine = last.pos[0];
            let range = lastLine - firstLine;
            this.allTokens(tokens, token => {
                if (token.pos[0] > firstLine) {
                    if (token.pos[0] > lastLine) {
                        token.pos[0] -= range;
                    } else {
                        token.pos[0] = firstLine;
                    }
                }
            });
        }
    }


    protected findItemAt(pos: vscode.Position, tokens: JsonSyntaxTree): TreeItem<JsonTokenType> | null {
        let result: TreeItem<JsonTokenType> | null = null;
        tokens.items.forEach(item => {
            if (!result) { result = this.findItemAtWalk(pos.line + 1, pos.character + 1, item); }
        });
        if (!result) {
            tokens.items.forEach(item => {
                if (!result) { result = this.findItemAtWalk(pos.line + 1, pos.character, item); }
            });
        }
        return result;
    }

    private findItemAtWalk(line: number, character: number, actual: TreeItem<JsonTokenType>): TreeItem<JsonTokenType> | null {
        let result: TreeItem<JsonTokenType> | null = null;
        actual.content.forEach(contentItem => {
            if (!result && contentItem instanceof TreeItemToken && contentItem.token) {
                if (line === contentItem.token.pos[0] && character === contentItem.token.pos[1]) {
                    result = actual;
                }
            }
            if (!result && contentItem instanceof TreeItemNode && contentItem.item) {
                result = this.findItemAtWalk(line, character, contentItem.item);
            }
        });
        return result;
    }

    private allTokens(tokens: JsonSyntaxTree, callback: (token: BaseParserToken<JsonTokenType>) => void) {
        tokens.items.forEach(item => {
            this.allTokensWalk(item, callback);
        });
    }

    private allTokensWalk(actual: TreeItem<JsonTokenType>, callback: (token: BaseParserToken<JsonTokenType>) => void) {
        actual.content.forEach(contentItem => {
            if (contentItem instanceof TreeItemToken && contentItem.token) {
                callback(contentItem.token);
            }
            if (contentItem instanceof TreeItemNode && contentItem.item) {
                this.allTokensWalk(contentItem.item, callback);
            }
        });
    }



    protected getPosition(lines: string[], index: number): vscode.Position {
        let line = 0;
        while (index >= lines[line].length) {
            index -= lines[line].length;
            index -= '\n'.length;
            line++;
            if (line >= lines.length) {
                return new vscode.Position(0, 0);
            }
            if (index < 0) {
                return new vscode.Position(0, 0);
            }
        }
        return new vscode.Position(line, index);
    }

    protected positionPlus(pos: vscode.Position, col: number): vscode.Position {
        return new vscode.Position(pos.line, pos.character + col);
    }

}