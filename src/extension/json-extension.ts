import * as vscode from 'vscode';
import { JsonLexer } from '../json/json_lexer';
import { JsonSyntaxParserFactory } from '../json/json_parser';
import { JsonFormater } from '../json/json_formater';
import { JsonSyntaxTree } from '../json/json_types';

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

    format(tree: JsonSyntaxTree) {
        let formatetCode = new JsonFormater().format(tree);
        return formatetCode;
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