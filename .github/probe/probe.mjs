const html = await (await fetch('https://ansar-ham.netlify.app/de/imprint')).text();
console.log('length', html.length);
console.log('--- first 400 ---\n' + html.slice(0, 400));
const bodyAt = html.indexOf('<body');
console.log('--- around </head><body> ---\n' + html.slice(html.indexOf('</head>') - 300, bodyAt + 600));
console.log('--- comments ---'); console.log([...html.matchAll(/<!--([\s\S]{0,60}?)-->/g)].map((m) => m[1]).slice(0, 40).join(' | '));
console.log('--- tags that are not React-ish ---');
console.log([...new Set([...html.matchAll(/<([a-z][a-z0-9-]*)/g)].map((m) => m[1]))].join(' '));
// Text right after <html ...> and between top-level tags
console.log('--- html open tag ---\n' + html.slice(html.indexOf('<html'), html.indexOf('<html') + 200));
const tail = html.slice(-1500); console.log('--- tail ---\n' + tail.replace(/self\.__next_f\.push\(\[1,"[\s\S]*?"\]\)/g, 'PUSH'));
// Non-script text nodes directly inside body
const body = html.slice(bodyAt);
console.log('--- raw newline count in body outside scripts ---', body.replace(/<script[\s\S]*?<\/script>/g, '').split('\n').length);
