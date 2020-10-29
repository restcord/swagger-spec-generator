import 'source-map-support/register';

import Parser from './Parser';

const parser = new Parser();

async function main() {
    return parser.getDefinition();
}

main().then(console.log).catch(console.error);
