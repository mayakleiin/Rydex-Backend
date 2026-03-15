import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import User from '../models/User';
import Car from '../models/Car';
import Comment from '../models/Comment';

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/rydex_test');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Comments API', () => {
  let accessToken: string;
  let otherToken: string;
  let carId: string;

  beforeAll(async () => {
    const userRes = await request(app)
      .post('/auth/register')
      .send({ username: 'commenter', email: 'commenter@example.com', password: 'password123' });
    accessToken = userRes.body.accessToken;

    const otherRes = await request(app)
      .post('/auth/register')
      .send({ username: 'other', email: 'other2@example.com', password: 'password123' });
    otherToken = otherRes.body.accessToken;

    const carRes = await request(app)
      .post('/cars')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Car for comment tests',
        description: 'A test car',
        make: 'Toyota',
        model: 'Corolla',
        year: '2020',
        location: 'Jerusalem',
        pricePerDay: '150',
      });
    carId = carRes.body._id;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Car.deleteMany({});
  });

  afterEach(async () => {
    await Comment.deleteMany({});
  });

  describe('POST /comments/:carId', () => {
    it('should add a comment when authenticated', async () => {
      const res = await request(app)
        .post(`/comments/${carId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: 'Great car!' });
      expect(res.status).toBe(201);
      expect(res.body.text).toBe('Great car!');
      expect(res.body.author).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).post(`/comments/${carId}`).send({ text: 'test' });
      expect(res.status).toBe(401);
    });

    it('should return 400 when text is empty', async () => {
      const res = await request(app)
        .post(`/comments/${carId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: '   ' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /comments/:carId', () => {
    it('should return all comments for a car', async () => {
      await request(app)
        .post(`/comments/${carId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: 'Comment 1' });
      await request(app)
        .post(`/comments/${carId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ text: 'Comment 2' });

      const res = await request(app).get(`/comments/${carId}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    it('should return empty array when car has no comments', async () => {
      const res = await request(app).get(`/comments/${carId}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('DELETE /comments/:id', () => {
    it('should delete own comment', async () => {
      const createRes = await request(app)
        .post(`/comments/${carId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: 'Delete me' });
      const commentId = createRes.body._id;

      const res = await request(app)
        .delete(`/comments/${commentId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
    });

    it('should return 403 when deleting another user comment', async () => {
      const createRes = await request(app)
        .post(`/comments/${carId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: 'Mine' });
      const commentId = createRes.body._id;

      const res = await request(app)
        .delete(`/comments/${commentId}`)
        .set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent comment', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .delete(`/comments/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(404);
    });
  });
});
