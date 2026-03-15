import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import User from '../models/User';

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/rydex_test');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Auth API', () => {
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
  };

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const res = await request(app).post('/auth/register').send(testUser);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should fail when fields are missing', async () => {
      const res = await request(app).post('/auth/register').send({ email: 'a@b.com' });
      expect(res.status).toBe(400);
    });

    it('should fail when password is too short', async () => {
      const res = await request(app).post('/auth/register').send({ ...testUser, password: '123' });
      expect(res.status).toBe(400);
    });

    it('should fail when email is already in use', async () => {
      await request(app).post('/auth/register').send(testUser);
      const res = await request(app).post('/auth/register').send(testUser);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/auth/register').send(testUser);
    });

    it('should login successfully and return tokens', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('should fail with wrong password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' });
      expect(res.status).toBe(401);
    });

    it('should fail with non-existent email', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'noone@example.com', password: 'password123' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return new tokens for a valid refresh token', async () => {
      const registerRes = await request(app).post('/auth/register').send(testUser);
      const { refreshToken } = registerRes.body;

      const res = await request(app).post('/auth/refresh').send({ refreshToken });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('should fail with an invalid refresh token', async () => {
      const res = await request(app).post('/auth/refresh').send({ refreshToken: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });

    it('should fail when refresh token is missing', async () => {
      const res = await request(app).post('/auth/refresh').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout and invalidate the refresh token', async () => {
      const registerRes = await request(app).post('/auth/register').send(testUser);
      const { refreshToken } = registerRes.body;

      const logoutRes = await request(app).post('/auth/logout').send({ refreshToken });
      expect(logoutRes.status).toBe(200);

      // Refresh should now fail
      const refreshRes = await request(app).post('/auth/refresh').send({ refreshToken });
      expect(refreshRes.status).toBe(401);
    });
  });
});
