'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('dist/index.html','utf8');
assert.match(html,/<a class="skip" href="#papers">/);
assert.match(html,/<main id="papers"[^>]*tabindex="-1"[^>]*aria-label="論文一覧"/);
assert.match(html,/<label class="sr-only" for="search">掲載中の学習教材を絞り込む<\/label>/);
assert(!/<button[^>]+id="motion"/.test(html),'intentional no-button surface is preserved');
console.log('PASS focusable labeled skip target and accurate local-filter accessible name. Static DOM structure only.');
