/**
 * Unit tests for JWT issuing/verification.
 * These run without a database.
 */
const test = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-ci';
const { generateToken, verifyToken } = require('../src/utils/token');

test('a generated token round-trips back to its payload', () => {
  const token = generateToken({ id: 42, role: 'student' });
  const decoded = verifyToken(token);

  assert.strictEqual(decoded.id, 42);
  assert.strictEqual(decoded.role, 'student');
});

test('a token carries issued-at and expiry claims', () => {
  const decoded = verifyToken(generateToken({ id: 1 }, '1h'));

  assert.ok(decoded.iat, 'iat claim should be present');
  assert.ok(decoded.exp, 'exp claim should be present');
  assert.strictEqual(decoded.exp - decoded.iat, 3600);
});

test('an expired token is rejected', async () => {
  const token = generateToken({ id: 1 }, '1ms');
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.throws(() => verifyToken(token), { name: 'TokenExpiredError' });
});

test('a tampered token is rejected', () => {
  const token = generateToken({ id: 1, role: 'student' });
  const [header, payload, signature] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ id: 1, role: 'lecturer' }))
    .toString('base64url');

  assert.throws(() => verifyToken(`${header}.${forged}.${signature}`), {
    name: 'JsonWebTokenError',
  });
});

test('a token signed with a different secret is rejected', () => {
  const jwt = require('jsonwebtoken');
  const foreign = jwt.sign({ id: 1 }, 'some-other-secret');

  assert.throws(() => verifyToken(foreign), { name: 'JsonWebTokenError' });
});
