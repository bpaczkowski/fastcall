/*
Copyright 2016 Gábor Mező (gabor.mezo@outlook.com)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';
const _ = require('lodash');
const Promise = require('bluebird');
const async = Promise.coroutine;
const imports = require('./imports');
const config = require('./config');
const assert = require('assert');
const common = require('./common');
const fastcall = require('../lib');
const ref = fastcall.ref;

module.exports = async(function* () {
    const lib = yield imports.importBenchlib.ffiWay();

    if (_.includes(config.modes, 'sync')) {
        console.log('--- sync ---');
        syncRun(lib);
    }
    if (_.includes(config.modes, 'async')) {
        console.log('--- async ---');
        yield asyncRun(lib);
    }
});

function syncRun(lib) {
    let result;

    const addNumbers = lib.addNumbersExp;
    common.measure('addNumbers', 3, () => {
        result = addNumbers(addNumbers(5.5, 5), addNumbers(1.1, 1));
    });
    assert.equal(result, 5.5 + 5 + 1 + 1);

    common.measure('concat', 1, () => {
        const str1 = ref.allocCString("Hello,");
        const str2 = ref.allocCString(" world!");
        const out = new Buffer(100);
        lib.concatExp(str1, str2, out, out.length);
        result = ref.readCString(out);
    });
    assert.equal(result, "Hello, world!");

    const cb = lib.TMakeIntFunc((a, b) => a + b);
    const makeInt = lib.makeIntExp;
    common.measure('callback', 3, () => {
        result = makeInt(makeInt(5.5, 5.1, cb, null), makeInt(1.1, 1.8, cb, null), cb, null);
    });
    assert.equal(result, 5 + 5 + 1 + 1);
}

var asyncRun = async(function* (lib) {
    let result;

    const addNumbersAsync =  Promise.promisify(lib.addNumbersExp.async);
    yield common.measureAsync('addNumbers', 3, async(function* () {
        result = yield addNumbersAsync(yield addNumbersAsync(5.5, 5), yield addNumbersAsync(1.1, 1));
    }));
    assert.equal(result, 5.5 + 5 + 1 + 1);

    const concatAsync =  Promise.promisify(lib.concatExp.async);
    yield common.measureAsync('concat', 1, async(function* () {
        const str1 = ref.allocCString("Hello,");
        const str2 = ref.allocCString(" world!");
        const out = new Buffer(100);
        yield concatAsync(str1, str2, out, out.length);
        result = ref.readCString(out);
    }));
    assert.equal(result, "Hello, world!");

    const cb = lib.TMakeIntFunc((a, b) => a + b);
    const makeIntAsync = Promise.promisify(lib.makeIntExp.async);
    yield common.measureAsync('callback', 3, async(function* () {
        result = yield makeIntAsync(yield makeIntAsync(5.5, 5.1, cb, null), yield makeIntAsync(1.1, 1.8, cb, null), cb, null);
    }));
    assert.equal(result, 5 + 5 + 1 + 1);
});