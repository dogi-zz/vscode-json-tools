import { JsonTokenType } from "./json_lexer";
import { TreeItemToken, TreeItem, TreeItemNode, BaseSyntaxTree } from "../parser/base-tree";
import { BaseParserToken } from "../parser/base-parser";


export interface JsonSyntaxToken extends BaseParserToken<JsonTokenType> { }

export abstract class JsonSyntaxTree extends BaseSyntaxTree<JsonTokenType>{ }

export abstract class JsonNode extends TreeItem<JsonTokenType> { }
export class JsonTreeItemToken extends TreeItemToken<JsonTokenType> { }
export class JsonTreeItemNode extends TreeItemNode<JsonTokenType> { }




export class JsonNull extends JsonNode {
    value: JsonTreeItemToken = new JsonTreeItemToken(this, 'value');
    constructor() { super(); this.comment = true; }
}

export class JsonBoolean extends JsonNode {
    value: JsonTreeItemToken = new JsonTreeItemToken(this, 'value');
    constructor() { super(); this.comment = true; }
}

export class JsonNumber extends JsonNode {
    value: JsonTreeItemToken = new JsonTreeItemToken(this, 'value');
    constructor() { super(); this.comment = true; }
}

export class JsonString extends JsonNode {
    value: JsonTreeItemToken = new JsonTreeItemToken(this, 'value');
    constructor() { super(); this.comment = true; }
}


export class JsonArray extends JsonNode {
    public ITEM = 'item';
    public COMMA = 'comma';
    start: JsonTreeItemToken = new JsonTreeItemToken(this, 'start');
    end: JsonTreeItemToken = new JsonTreeItemToken(this, 'end');
    constructor() { super(); this.comment = true; }
}

export class JsonObject extends JsonNode {
    public NAME = 'item';
    public COLON = 'colon';
    public VALUE = 'value';
    public COMMA = 'comma';
    start: JsonTreeItemToken = new JsonTreeItemToken(this, 'start');
    end: JsonTreeItemToken = new JsonTreeItemToken(this, 'end');
    constructor() { super(); this.comment = true; }
}

