"use strict";
// Current production policy: no external discovery at all, not merely private queries.
const {execFileSync}=require('node:child_process');
const path=require('node:path');
execFileSync('python3',[path.resolve(__dirname,'../../scripts/check-home-materials.py')],{stdio:'inherit'});
