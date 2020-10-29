import * as $ from 'cheerio';
import {capitalize} from 'lodash';
import * as marked from 'marked';

const pathRegex       = /^(?<name>[A-Za-z ]+)\s%\s(?<method>[A-Z\\]+)\s(?<route>[A-Za-z0-9\/{}.#_-]+)/;
const routeParamRegex = /{(?<name>[A-Za-z\.]+)#DOCS_(?<docType>RESOURCES|TOPICS)_(?<docCategory>[A-Z_]+)\/(?<link>.+?)}/gm;

interface RouteParameter {
    name: string;
    docType: 'resources' | 'topics';
    docCategory: string;
    link: string;
    match: string;
}

export default class {
    private readonly html: string;

    private readonly selector: Cheerio;

    // @ts-ignore
    private readonly paths: Cheerio;

    private readonly definitions: Cheerio;

    public constructor(category: string, markdown: string) {
        this.html        = marked(markdown);
        this.selector    = $(`<div class="category" data-category="${category}">
    <h1>${category}</h1>
    <div id="paths" style="padding: 0 1rem"></div>
    <div id="definitions" style="padding: 0 1rem"></div>
</div>`);
        this.paths       = this.selector.find('#paths');
        this.definitions = this.selector.find('#definitions');
    }

    public convert(): Cheerio {
        this.convertPaths();
        this.convertDefinitions();

        return this.selector;
    }

    private convertPaths(): void {
        $.load(this.html)('h2').filter((_, h2) => pathRegex.test($(h2).text())).each((_, element) => {
            element.tagName = 'h3';
            const h3        = $(element);
            const wrapper   = $('<div class="path" style="border: 2px solid black; padding: .5rem; margin: 1rem;" />');
            const siblings  = $('<div/>').append(h3.nextUntil('h2'));

            const matches = h3.text().match(pathRegex);

            const route       = $(`<div class="header" />`);
            const description = $('<div class="description" />');
            const params      = $('<div class="params" />');

            route.append(`<h3 class="title">${matches.groups.name}</h3>`);
            route.append(`<h3 class="method" style="display: inline; padding-right: 1rem; font-size: 20px;">${matches.groups.method}</h3>`);

            const routeParameters = this.parseRouteParameters(matches.groups.route);
            if (routeParameters.length > 0) {
                const wrapper = $(`<div data-type="route-params"><h5>Route Params</h5></div>`);
                const table   = $(`<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Doc Type</th>
            <th>Doc Category</th>
            <th>Link</th>
        </tr>
    </thead>
    <tbody></tbody>
</table>`);
                for (const parameter of routeParameters) {
                    table.find('tbody').append($(`<tr>
    <td data-name="name">${parameter.name}</td>
    <td data-name="docType">${parameter.docType}</td>
    <td data-name="docCategory">${parameter.docCategory}</td>
    <td data-name="link">${parameter.link}</td>
</tr>`));
                    matches.groups.route = matches.groups.route.replace(parameter.match, `{${parameter.name}}`);
                }
                table.appendTo(wrapper);
                wrapper.appendTo(params);
            }
            route.append(`<h3 class="route" style="display: inline; font-size: 20px;">${matches.groups.route}</h3>`);

            const remainder = $(
                '<div class="raw-data" style="display: none; border: 1px solid grey; padding: .25rem; margin: .5rem;" />');
            remainder.append($('<h2>Raw Data</h2>'), siblings);

            siblings.find('h6').each((_, ele) => {
                const header = $(ele);
                if (/^(query-string|json)?-?param(eters|s)/.test(ele.attribs.id)) {
                    const wrapper    = $(`<div data-type="${ele.attribs.id}">
    <h5>${header.text()}</h5>
</div>`);
                    const paramTable = header.next('table').clone();
                    const fields     = {};
                    paramTable.find('th').each((index, field) => fields[index] = $(field).text().toLowerCase());
                    paramTable.find('tr').each((_, tr) => {
                        $(tr).find('td').each((__, td) => {
                            $(td).replaceWith($(`<td data-name="${fields[__]}">${$(td).text()}</td>`));
                        });
                    });

                    wrapper.append(paramTable).appendTo(params);

                    return;
                }
            });
            siblings.find('p').each((_, ele) => {
                if ($(ele).text().trim().length === 0) {
                    return;
                }

                description.append($(ele).clone());
            });

            wrapper.append(route, description, params, remainder);

            this.paths.append(wrapper);
        });

        this.paths.prepend('<h2>Paths</h2>');
    }

    private parseRouteParameters(route: string): RouteParameter[] {
        const parameters: RouteParameter[] = [];

        let m;
        while ((m = routeParamRegex.exec(route)) !== null) {
            if (m.index === routeParamRegex.lastIndex) {
                routeParamRegex.lastIndex++;
            }

            parameters.push({
                name:        m.groups.name,
                docType:     m.groups.docType.toLowerCase(),
                docCategory: capitalize(m.groups.docCategory.replace(/_/g, ' ')).replace(/\s/g, '_'),
                link:        m.groups.link,
                match:       m[0],
            });
        }

        return parameters;
    }

    private convertDefinitions(): void {
        $.load(this.html)('h3').filter((_, h3) => h3.attribs.id.includes('-object')).each((_, element) => {
            const h3       = $(element);
            const wrapper  = $(
                '<div class="definition" style="border: 2px solid black; padding: .5rem; margin: 1rem;" />');
            const siblings = $('<div/>').append(h3.nextUntil('h3'));

            const title = $(`<h3 class="title">${h3.text()}</h3>`);

            const description = $('<div class="description" />');
            const params      = $('<div class="params" />');
            const remainder   = $(
                '<div class="raw-data" style="display: none; border: 1px solid grey; padding: .25rem; margin: .5rem;" />');
            remainder.append($('<h2>Raw Data</h2>'), siblings);

            siblings.find('h6').each((_, ele) => {
                const header = $(ele);
                if (/^(.+)-structure/.test(ele.attribs.id)) {
                    const paramTable = header.next('table').clone();
                    paramTable.wrap(`<div class="${ele.attribs.id}"/>`);
                    paramTable.appendTo(params);

                    return;
                }
            });
            siblings.find('p').each((_, ele) => {
                description.append($(ele).clone());
            });

            wrapper.append(title, description, params, remainder);

            this.definitions.append(wrapper);
        });

        this.definitions.prepend('<h2>Definitions</h2>');
    }
}
