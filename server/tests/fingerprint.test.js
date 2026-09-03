/**
 * Integration tests for the one-device-per-student anti-cheat rules.
 * Requires a running PostGIS database.
 */
const test = require('node:test');
const assert = require('node:assert');
const pool = require('../src/config/db');
const fp = require('../src/services/fingerprint.service');

const ALICE = 'CI-TEST-ALICE';
const BOB = 'CI-TEST-BOB';
let alice, bob;

async function makeStudent(reg) {
  const { rows } = await pool.query(
    `INSERT INTO students (reg_number, full_name, email, password_hash, department)
     VALUES ($1, $2, $3, 'x', 'CI')
     RETURNING id`,
    [reg, `Test ${reg}`, `${reg.toLowerCase()}@ci.local`]
  );
  return rows[0].id;
}

test.before(async () => {
  await pool.query('DELETE FROM students WHERE reg_number = ANY($1)', [[ALICE, BOB]]);
  alice = await makeStudent(ALICE);
  bob = await makeStudent(BOB);
});

test.after(async () => {
  await pool.query('DELETE FROM students WHERE reg_number = ANY($1)', [[ALICE, BOB]]);
  await pool.end();
});

test('a device binds to the student who registers it first', async () => {
  const result = await fp.registerFingerprint(alice, 'device-hash-aaa');
  assert.strictEqual(result.success, true);
});

test('the same device cannot be bound to a second student', async () => {
  const result = await fp.registerFingerprint(bob, 'device-hash-aaa');

  assert.strictEqual(result.success, false);
  assert.match(result.error, /already registered to another student/);
  assert.match(result.error, new RegExp(ALICE));
});

test('re-registering the same device to the same student is idempotent', async () => {
  const result = await fp.registerFingerprint(alice, 'device-hash-aaa');
  assert.strictEqual(result.success, true);
});

test('the registered device verifies', async () => {
  const result = await fp.verifyFingerprint(alice, 'device-hash-aaa');
  assert.strictEqual(result.verified, true);
});

test('a different device fails verification', async () => {
  const result = await fp.verifyFingerprint(alice, 'device-hash-zzz');

  assert.strictEqual(result.verified, false);
  assert.match(result.error, /Device mismatch/);
});

test('a first-time device is bound on first verification', async () => {
  const result = await fp.verifyFingerprint(bob, 'device-hash-bbb');
  assert.strictEqual(result.verified, true);

  const { rows } = await pool.query(
    'SELECT device_fingerprint FROM students WHERE id = $1', [bob]
  );
  assert.strictEqual(rows[0].device_fingerprint, 'device-hash-bbb');
});

test('verification of an unknown student fails safely', async () => {
  const result = await fp.verifyFingerprint(999999, 'device-hash-ccc');

  assert.strictEqual(result.verified, false);
  assert.match(result.error, /Student not found/);
});
