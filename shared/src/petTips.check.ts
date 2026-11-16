import assert from 'node:assert/strict';
import { petTips } from './petTips';

assert.equal(petTips(undefined), '');
assert.equal(petTips({ mood: 4, stress: 2, missionOutlook: 4 }, 7.5), '');
const t = petTips({ mood: 1, stress: 5, missionOutlook: 1 }, 4, true);
assert.match(t, /noticia difícil/);
assert.match(t, /Durmió poco/);
assert.doesNotMatch(t, /Estrés alto/, 'max two cards, by priority');
assert.match(petTips({ mood: 2, stress: 3, missionOutlook: 3 }), /Ánimo bajo/);
console.log('petTips ok');
