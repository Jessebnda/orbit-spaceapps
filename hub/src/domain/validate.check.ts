import assert from 'node:assert/strict';
import { cleanMetrics, parse } from './validate';

assert.equal(parse('not json'), null);
assert.equal(parse('{"crewId":"c1"}'), null);                          // no t
assert.equal(parse('{"t":"nope"}'), null);                             // unknown t
assert.equal(parse('{"t":"vitals","crewId":"c1"}'), null);             // missing metrics
assert.equal(parse('{"t":"sos","crewId":"c1","kind":"lol"}'), null);   // bad emergency kind
assert.ok(parse('{"t":"vitals","crewId":"c1","ts":1,"metrics":{"hr":70}}'));
assert.deepEqual(cleanMetrics({ hr: 70, spo2: '98', bogus: 1, temp: NaN }), { hr: 70 });

console.log('validate.check: ok');
