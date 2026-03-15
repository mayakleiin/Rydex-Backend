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

describe('Users API', () => {
  let accessToken: string;
  let userId: string;

  const testUser = {
    username: 'profileuser',
    email: 'profile@example.com',
    password: 'password123',
  };

  beforeAll(async () => {
    const res = await request(app).post('/auth/register').send(testUser);
    accessToken = res.body.accessToken;
    userId = res.body.user._id;
  });

  afterAll(async () => {
    await User.deleteMany({});
  });

  describe('GET /users/:id', () => {
    it('should return the user profile without sensitive fields', async () => {
      const res = await request(app).get(`/users/${userId}`);
      expect(res.status).toBe(200);
      expect(res.body.username).toBe(testUser.username);
      expect(res.body.email).toBe(testUser.email);
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('refreshTokens');
    });

    it('should return 404 for a non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/users/${fakeId}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /users/:id', () => {
    it('should update the username when authenticated', async () => {
      const res = await request(app)
        .put(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ username: 'updatedname' });
      expect(res.status).toBe(200);
      expect(res.body.username).toBe('updatedname');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).put(`/users/${userId}`).send({ username: 'hacker' });
      expect(res.status).toBe(401);
    });

    it('should return 403 when updating another user', async () => {
      const otherId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .put(`/users/${otherId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ username: 'hacker' });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /users/:id/cars', () => {
    it('should return an empty list when user has no listings', async () => {
      const res = await request(app).get(`/users/${userId}/cars`);
      expect(res.status).toBe(200);
      expect(res.body.cars).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });
  });
});
