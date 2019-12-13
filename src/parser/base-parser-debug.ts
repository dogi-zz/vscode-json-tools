import { BaseParserToken } from "./base-parser";

export type ParserDebugItem = [BaseParserToken<any> | null, string, string, 0 | 1 | 2, boolean] | 'enter' | 'leave';

const fs = require('fs');

export class BaseParserdebug {



    public static exportTreeReport(debugReport: ParserDebugItem[], code: string[]) {
        this.exportReport('Syntax Tree', debugReport, code);
    }

    public static exportErrorReport(debugReport: ParserDebugItem[], code: string[]) {
        this.exportReport('Error Report', debugReport, code);
    }

    private static exportReport(title: string, debugReport: ParserDebugItem[], code: string[]) {
        let out = '';
        out += '<html>\n';
        out += this.header(title);
        out += '<body>\n';

        out += '<h1>' + title + '</h1>\n';

        let spinnerstyle = 'position: fixed; left: calc( 50vw - 180px );';
        out += '<img id="spinner" src="https://support.upjers.com/bundles/upjerssupportmain/images/spinner.GIF" style="' + spinnerstyle + '">\n';

        out += '<span onclick="toggleComments(this);" style="color: #444; margin: 10px; cursor: pointer;">comments</span>\n';

        out += '<div style="margin: 10px 10px 30px;">\n';
        debugReport.forEach((reportItem, idx) => {
            if (reportItem === 'enter') {
                out += '<div class="child" style="border-left: 1px dotted gray; margin-left: 12px;">\n';
                return;
            }
            if (reportItem === 'leave') {
                out += '</div>\n';
                return;
            }

            let token = reportItem[0];
            let marker = reportItem[1];
            let message = reportItem[2];
            let severity = reportItem[3];
            let isComment = reportItem[4];

            let trClass = 'row';
            if (isComment) { trClass += ' comment'; }

            let icon = '';
            if (idx + 1 < debugReport.length && debugReport[idx + 1] === 'enter') {
                let onclick = 'toggle(this);';
                icon = '<span class="dot" onclick="' + onclick + '">+</span>';
            }

            out += '<div class="' + trClass + '" style="display: flex;">';

            out += '<div class="icon" style="width:12px;">';
            out += icon;
            out += '</div>';

            let sevClass = 'sevNone';
            if (severity === 1) { sevClass = 'sevGood'; }
            if (severity === 2) { sevClass = 'sevBad'; }

            out += '<div class="marker cell">';
            out += marker;
            out += '</div>';

            out += '<div class="message cell ' + sevClass + '">';
            out += message;
            out += '</div>';

            if (token) {
                out += '<div class="line">' + token.pos[0] + '</div>';
                let title = JSON.stringify(token).replace(/[\u00A0-\u9999<>\&]/gim, function (i) { return "&#" + i.charCodeAt(0) + ";"; }).replace(/"/g, '&quot;');
                let line = code[token.pos[0] - 1];
                let linePos = token.pos[1] - 1;
                let lineLen = token.value.length;
                out += '<div class="code" title="' + title + '">';
                out += this.toEntities(line.substr(0, linePos));
                out += '<b>' + this.toEntities(line.substr(linePos, lineLen)) + '</b>';
                out += this.toEntities(line.substr(linePos + lineLen));
                out += '</div>';
            } else {
                out += '<div class="line"></div>';
                out += '<div class="code"></div>';
            }

            out += '</div>\n';
        });
        out += '</div>\n';

        out += '<script>\n';
        out += '  $(".child").each(function(){\n';
        out += '    $(this).hide();\n';
        out += '  });\n';
        out += '  $("#spinner").hide();\n';
        out += '</script>\n';


        out += '</body>\n';
        out += '</html>\n';
        fs.writeFileSync('debug-report.html', out, 'UTF-8');
    }

    private static toEntities(str: string) {
        return str.replace(/./gm, function (s) {
            return "&#" + s.charCodeAt(0) + ";";
        });
    }

    static header(title: string) {
        let out = '';
        out += '<head>\n';
        out += '  <title>' + title + '</title>\n';
        out += '  <script src="https://code.jquery.com/jquery-3.4.1.min.js" ></script>\n';

        out += '  <style>\n';
        out += '     div.cell{\n';
        out += '       border: 1px solid gray;\n';
        out += '       margin: 1px;\n';
        out += '     }\n';

        out += '     div.comment{\n';
        out += '       color: #999;\n';
        out += '     }\n';

        out += '     div.icon .dot{\n';
        out += '       cursor: pointer;\n';
        out += '     }\n';

        out += '     div.marker{\n';
        out += '       width: 100;\n';
        out += '     }\n';

        out += '     div.message{\n';
        out += '       flex: 1;\n';
        out += '     }\n';
        out += '     div.message.sevGood{\n';
        out += '       color: #008800;\n';
        out += '     }\n';
        out += '     div.message.sevBad{\n';
        out += '       color: #880000;\n';
        out += '     }\n';

        out += '     div.code{\n';
        out += '       font-family: monospace;\n';
        out += '       font-size: 10px;\n';
        out += '       width: 50vw;\n';
        out += '     }\n';
        out += '     div.code b{\n';
        out += '       color: red;\n';
        out += '     }\n';

        out += '     div.line{\n';
        out += '       font-family: monospace;\n';
        out += '       font-size: 10px;\n';
        out += '       text-align: right;\n';
        out += '       width: 30px;\n';
        out += '       margin: 2px 5px;\n';
        out += '     }\n';

        out += '  </style>\n';
        out += '  <script>\n';
        out += '     var commentShown = true;\n';
        out += '     function toggleComments(link){\n';
        out += '       $("#spinner").show();\n';
        out += '       if (commentShown){\n';
        out += '         commentShown = false;\n';
        out += '         $(".child:visible").children(".comment").hide();\n';
        out += '         link.style.color = "#999";\n';
        out += '       } else {\n';
        out += '         commentShown = true;\n';
        out += '         $(".child:visible").children(".comment").show();\n';
        out += '         link.style.color = "#444";\n';
        out += '       }\n';
        out += '       $("#spinner").hide();\n';
        out += '     }\n';
        out += '     function toggle(span){\n';
        out += '       $("#spinner").show();\n';
        out += '       var row = $(span).closest(".row");\n';
        out += '       var child = row.next(".child");\n';
        out += '       if ($(span).text() == "+"){\n';
        out += '         child.show();\n';
        out += '         $(span).text("-");\n';
        out += '       } else {\n';
        out += '         child.hide();\n';
        out += '         $(span).text("+");\n';
        out += '       }\n';
        out += '       if (!commentShown){\n';
        out += '         $(".child:visible").children(".comment").show();\n';
        out += '       }\n';
        out += '       $("#spinner").hide();\n';
        out += '     }\n';
        out += '  </script>\n';
        out += '<head>\n';
        return out;
    }

}