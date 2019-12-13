import { JsonTokenType } from "./json_lexer";
import {
    JsonNode, JsonNull, JsonBoolean, JsonNumber, JsonString, JsonArray, JsonObject,
} from "./json_types";
import { BaseParserFactory } from "../parser/base-parser";



export class JsonSyntaxParserFactory extends BaseParserFactory<JsonTokenType>{

    constructor() {
        super();

        // this.addRule('comment', () => new ScadComment(), (rule, result) => {
        //

        this.addRule('[expression]', () => <JsonNode>{}, (rule, subject) => {
            if (rule.expectRule('null', (c) => { subject = c; })) { return [subject, rule.index]; }
            if (rule.expectRule('bool', (c) => { subject = c; })) { return [subject, rule.index]; }
            if (rule.expectRule('number', (c) => { subject = c; })) { return [subject, rule.index]; }
            if (rule.expectRule('string', (c) => { subject = c; })) { return [subject, rule.index]; }
            if (rule.expectRule('array', (c) => { subject = c; })) { return [subject, rule.index]; }
            if (rule.expectRule('object', (c) => { subject = c; })) { return [subject, rule.index]; }
            rule.error('expected:[expression]');
            return false;
        }).asMain();



        this.addRule('null', () => new JsonNull(), (rule, subject) => {
            if (!rule.expectToken('KEYWORD', 'null', (t) => { subject.value.set(t); })) { return false; }
            return [subject, rule.index];
        });

        this.addRule('bool', () => new JsonBoolean(), (rule, subject) => {
            if (!rule.expectToken('KEYWORD', ['true', 'false'], (t) => { subject.value.set(t); })) { return false; }
            return [subject, rule.index];
        });

        this.addRule('number', () => new JsonNumber(), (rule, subject) => {
            if (!rule.expectToken('NUMBER', null, (t) => { subject.value.set(t); })) { return false; }
            return [subject, rule.index];
        });


        this.addRule('string', () => new JsonString(), (rule, subject) => {
            if (!rule.expectToken('STRING', null, (t) => { subject.value.set(t); })) { return false; }
            return [subject, rule.index];
        });

        
        this.addRule('array', () => new JsonArray(), (rule, subject) => {
            if (!rule.expectToken('BRACE', '[', (t) => { subject.start.set(t); })) { return false; }
            let elementsDone = rule.testToken('BRACE', ']');
            while (!elementsDone) {
                if (!rule.expectRule('[expression]', (c) => { subject.addNamedNode(subject.ITEM, c); })) { return false; }
                if (rule.testToken('SYMBOL', ',')) {
                    if (!rule.expectToken('SYMBOL', ',', (t) => { subject.addNamedToken(subject.COMMA, t); })) { return false; }
                } else {
                    elementsDone = true;
                }
            }
            if (!rule.expectToken('BRACE', ']', (t) => { subject.end.set(t); })) { return false; }
            return [subject, rule.index];
        });

        
        this.addRule('object', () => new JsonObject(), (rule, subject) => {
            if (!rule.expectToken('BRACE', '{', (t) => { subject.start.set(t); })) { return false; }
            let elementsDone = rule.testToken('BRACE', '}');
            while (!elementsDone) {
                if (!rule.expectToken('STRING', null, (c) => { subject.addNamedToken(subject.NAME, c); })) { return false; }
                if (!rule.expectToken('SYMBOL', ':', (c) => { subject.addNamedToken(subject.COLON, c); })) { return false; }
                if (!rule.expectRule('[expression]', (c) => { subject.addNamedNode(subject.VALUE, c); })) { return false; }
                if (rule.testToken('SYMBOL', ',')) {
                    if (!rule.expectToken('SYMBOL', ',', (t) => { subject.addNamedToken(subject.COMMA, t); })) { return false; }
                } else {
                    elementsDone = true;
                }
            }
            if (!rule.expectToken('BRACE', '}', (t) => { subject.end.set(t); })) { return false; }
            return [subject, rule.index];
        });


    }




}
