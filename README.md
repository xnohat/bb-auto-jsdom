# bb-auto-jsdom
Budibase Automation Plugin for running browser-compatible JavaScript code, support importing libraries from CDN.

# Description
Budibase Automation Plugin for running browser-compatible JavaScript code, support importing libraries from CDN.

Find out more about [Budibase](https://github.com/ConductifyAI/bb-auto-jsdom).

## Instructions

To build your new  plugin run the following in your Budibase CLI:
```
yarn build
```

You can also re-build everytime you make a change to your plugin with the command:
```
yarn watch
```

## Build Notes
This code need some dirty patch in node_modules to compile it successfully.
jsdom lib using punycode but it import with name "punycode/" will got error when bundle in cjs.
find all 
```
punycode/
```
replace with 
```
punycode
```
in these files:
```
node_modules\tough-cookie\lib\cookie.js
node_modules\tr46\index.js
```

also find 
```
const syncWorkerFile = require.resolve ? require.resolve("./xhr-sync-worker.js") : null;
```
replace with
```
const syncWorkerFile = null;
```
in 
```
node_modules\jsdom\lib\jsdom\living\xhr\XMLHttpRequest-impl.js
```

## Usage

For import library from CDN, you can use the following code:
```
await _require("https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js")
console.log(_.chunk(['a', 'b', 'c', 'd'], 2));
const response = await fetch('https://api.ipify.org?format=json');
const data = await response.json();
//await new Promise(resolve => setTimeout(resolve, 10000));
return data;
```