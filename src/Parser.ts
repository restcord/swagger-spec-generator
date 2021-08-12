import * as $ from 'cheerio';
import {writeFileSync} from 'fs';
//import * as tabletojson from 'tabletojson';
import * as request from 'request-promise';
import MarkdownToHtml from './MarkdownToHtml';
import PathInterface, {HttpMethod} from './PathInterface';

var fs = require('fs');
// export const snowflakes = ['channel.id', 'guild.id', 'message.id', 'user.id', 'webhook.id'];
const baseUrl = 'https://raw.githubusercontent.com/discord/discord-api-docs/master/docs';

type Category = 'resources' | 'topics';

interface CategoryItem {
    type: Category;
    name: string;
}

const url = (type: Category, item: string) => `${baseUrl}/${type}/${item}.md`;

export default class Parser {
    private categories: CategoryItem[] = [
        {type: 'resources', name: 'Application'},
        {type: 'resources', name: 'Audit_Log'},
        {type: 'resources', name: 'Channel'},
        {type: 'resources', name: 'Emoji'},
        {type: 'resources', name: 'Guild'},
        {type: 'resources', name: 'Invite'},
        {type: 'resources', name: 'Stage_Instance'},
        {type: 'resources', name: 'Sticker'},
        {type: 'resources', name: 'User'},
        {type: 'resources', name: 'Voice'},
        {type: 'resources', name: 'Webhook'},
        {type: 'topics', name: 'Gateway'},
        {type: 'topics', name: 'OAuth2'},
        {type: 'topics', name: 'Permissions'},
    ];

    private skip = ['Channel:Create Message'];

    public async getDefinition() {
        const html = await this.parseGithub();
        writeFileSync(process.cwd() + '/test.html', html.html());
        //@ts-ignore
        const [paths, definitions] = await this.parseHtml(html);
        //console.log(paths, definitions);
        console.dir(paths, {depth: null, maxArrayLength: null});
        fs.writeFile('json/paths.json', JSON.stringify(paths), 'utf8', function(err){
            if(err){ 
                  console.log(err); 
            } else {
                  //Everything went OK!
            }});
    }

    private async parseGithub(): Promise<Cheerio> {
        let html = $.load('<body><div id="categories"></div></body>');

        for (const resource of this.categories) {
            const category  = resource.name.replace('_', ' ');
            const converter = new MarkdownToHtml(category, await request(url(resource.type, resource.name)));

            html('body #categories').append(converter.convert());
        }

        return html('body').children(); // Cheerio types are stupid.
    }

    private async parseHtml(html: Cheerio): Promise<[PathInterface[], any[]]> {
        const paths: PathInterface[] = [];
        //const definitions: any[] = [];

        html.find('div.category').each((_categoryIndex, categoryElement) => {
            const $categoryElement = $(categoryElement);
            const category         = $categoryElement.data().category;
            $categoryElement.find('#paths div.path').each((_pathIndex, pathElement) => {
                const $pathElement = $(pathElement);

                // Parsing name, method, route, and description
                const name                = $pathElement.find('h3.title').text();
                const path: PathInterface = {
                    category,
                    name,
                    method:      $pathElement.find('h3.method').text() as HttpMethod,
                    route:       $pathElement.find('h3.route').text(),
                    description: $pathElement.find('p').text(),
                    parameters:  [],
                    skip:        this.skip.includes(category + ':' + name),
                };

                // parsing Parameters
                $pathElement.find('.params > div').each((_paramIndex, paramElement) => {
                    const $paramElement = $(paramElement);
                    const table         = $paramElement.find('table');
                    table.find('tr').each((_trIndex, _trElement) => {
                        //const $trElement = $(trElement);

                    });
                });

                paths.push(path);
            });
        });

        return [paths, []];
    }
}
