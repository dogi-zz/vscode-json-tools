import { BaseFormater } from "../parser/base-formater";
import { TreeItemNode, TreeItemToken } from "../parser/base-tree";
import { JsonTokenType } from "./json_lexer";
import { //
    JsonNull, JsonBoolean, JsonNumber, JsonString, JsonArray, JsonObject,
} from "./json_types";
import { } from "./json_types";
import { getCorrectedLine, BaseParserToken } from "../parser/base-parser";
import { TIMEOUT } from "dns";



export class JsonFormater extends BaseFormater<JsonTokenType>{


    constructor() { 
        super();
    }

    process() {
        this.processLines();
        this.processMargin();
        this.processIndent();
    }


    // ==== LINES ====

    processLines() {
        this.walkTokens((token, walker) => {
            if (walker.lastToken) {
                let lineDist = getCorrectedLine(token) - getCorrectedLine(walker.lastToken);
                if (lineDist > 2) {
                    walker.moveLine(-(lineDist - 2));
                }
            }
        });

        this.walkItems((item, token, walker) => {
            if (item instanceof JsonArray) {
                this.breakEnvirentmentedTokens(item, walker, () => [item.start, item.end, item.COMMA]);
            }
            if (item instanceof JsonObject) {
                this.breakEnvirentmentedTokens(item, walker, () => [item.start, item.end, item.COMMA]);
            }
        });

    }

    processMargin() {
        this.walkTokens((token, walker) => {
            if (token.type === 'BRACE') {
                if (['{'].includes(token.value) && walker.nextToken && walker.nextToken.type !== 'BRACE') {
                    this.setMarginRight(token, 1);
                }
                if (['}'].includes(token.value) && walker.lastToken && walker.lastToken.type !== 'BRACE') {
                    this.setMarginLeft(token, 1);
                }
            }
            if (token.type === 'SYMBOL' && [','].includes(token.value)) {
                this.setMarginRight(token, 1);
            }
            if (token.type === 'SYMBOL' && [':'].includes(token.value)) {
                this.setMarginRight(token, 1);
            }
        });
    }




    processIndent() {
        this.walkIndent((item, token, walker) => {
            if (item instanceof JsonArray) {
                this.addIndentBetween(item, walker, () => [item.start, item.end], 2);
            }
            if (item instanceof JsonObject) {
                this.addIndentBetween(item, walker, () => [item.start, item.end], 2);
            }
        });

    }



}

