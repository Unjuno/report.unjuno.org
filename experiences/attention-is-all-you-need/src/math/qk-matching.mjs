/** Pure numeric teaching example. No trained model weights or model outputs. */
export const INITIAL_QUERY = Object.freeze([1, 1]);
export const INITIAL_KEYS = Object.freeze([
  Object.freeze({id: 'A', vector: Object.freeze([2, 0])}),
  Object.freeze({id: 'B', vector: Object.freeze([0, 2])}),
  Object.freeze({id: 'C', vector: Object.freeze([-1, 1])}),
]);
function finiteVector(vector) {
  if (!Array.isArray(vector) || !vector.length || !vector.every(Number.isFinite)) {
    throw new TypeError('A vector must be a non-empty array of finite numbers.');
  }
}
export function dot(query, key) {
  finiteVector(query); finiteVector(key);
  if (query.length !== key.length) throw new RangeError('Vector dimensions must match.');
  return query.reduce((sum, value, i) => sum + value * key[i], 0);
}
export function evaluateQuery(query, keys = INITIAL_KEYS) {
  finiteVector(query);
  if (!Array.isArray(keys) || !keys.length) throw new TypeError('At least one key is required.');
  const rows = keys.map(({id, vector}) => ({id, vector: [...vector], products: query.map((x, i) => x * vector[i]), score: dot(query, vector)}));
  const maximum = Math.max(...rows.map(row => row.score));
  return {rows, maximum, winnerIds: rows.filter(row => Math.abs(row.score - maximum) < 1e-9).map(row => row.id)};
}
export function formatNumber(value) {
  if (!Number.isFinite(value)) throw new TypeError('The value must be finite.');
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? '0' : String(rounded);
}
