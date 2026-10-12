import {readdirSync} from 'node:fs';import {spawnSync} from 'node:child_process';
process.chdir(import.meta.dirname + '/..');
let failed=false;for(const dir of ['js','scripts'])for(const file of readdirSync(dir).filter(f=>/\.(js|mjs)$/.test(f))){const result=spawnSync(process.execPath,['--check',`${dir}/${file}`],{encoding:'utf8'});if(result.status){console.error(result.stderr);failed=true;}}
if(failed)process.exit(1);console.log('JavaScript syntax checks passed.');
