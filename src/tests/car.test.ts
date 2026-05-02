import request from "supertest";
import mongoose from "mongoose";
import app from "../app";
import User from "../models/User";
import Car from "../models/Car";

beforeAll(async () => {
  await mongoose.connect(
    process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/rydex_test",
  );
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe("Cars API", () => {
  let accessToken: string;
  let otherToken: string;

  const carData = {
    title: "Tesla Model 3 for rent",
    description: "Great electric car, barely used",
    make: "Tesla",
    model: "Model 3",
    year: "2022",
    location: "Tel Aviv",
    pricePerDay: "200",
    fuelType: "Electric",
    transmission: "Automatic",
    seats: "5",
  };

  beforeAll(async () => {
    const ownerRes = await request(app)
      .post("/auth/register")
      .send({
        username: "carowner",
        email: "owner@example.com",
        password: "password123",
      });
    accessToken = ownerRes.body.accessToken;

    const otherRes = await request(app)
      .post("/auth/register")
      .send({
        username: "otheruser",
        email: "other@example.com",
        password: "password123",
      });
    otherToken = otherRes.body.accessToken;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Car.deleteMany({});
  });

  afterEach(async () => {
    await Car.deleteMany({});
  });

  describe("POST /cars", () => {
    it("should create a car listing when authenticated", async () => {
      const res = await request(app)
        .post("/cars")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(carData);
      expect(res.status).toBe(201);
      expect(res.body.make).toBe("Tesla");
      expect(res.body.owner).toBeDefined();
    });

    it("should return 401 without authentication", async () => {
      const res = await request(app).post("/cars").send(carData);
      expect(res.status).toBe(401);
    });

    it("should return 400 when required fields are missing", async () => {
      const res = await request(app)
        .post("/cars")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ title: "Only title" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /cars", () => {
    beforeEach(async () => {
      await request(app)
        .post("/cars")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(carData);
    });

    it("should return paginated car listings", async () => {
      const res = await request(app).get("/cars");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("cars");
      expect(res.body).toHaveProperty("total");
      expect(res.body).toHaveProperty("page");
      expect(Array.isArray(res.body.cars)).toBe(true);
    });

    it("should support filtering by make", async () => {
      const res = await request(app).get("/cars?make=Tesla");
      expect(res.status).toBe(200);
      expect(
        res.body.cars.every((c: { make: string }) => c.make === "Tesla"),
      ).toBe(true);
    });
  });

  describe("GET /cars/:id", () => {
    it("should return a single car with commentsCount", async () => {
      const createRes = await request(app)
        .post("/cars")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(carData);
      const carId = createRes.body._id;

      const res = await request(app).get(`/cars/${carId}`);
      expect(res.status).toBe(200);
      expect(res.body._id).toBe(carId);
      expect(res.body).toHaveProperty("commentsCount");
    });

    it("should return 404 for non-existent car", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/cars/${fakeId}`);
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /cars/:id", () => {
    it("should update a car listing (owner only)", async () => {
      const createRes = await request(app)
        .post("/cars")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(carData);
      const carId = createRes.body._id;

      const res = await request(app)
        .put(`/cars/${carId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ title: "Updated Tesla listing" });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Updated Tesla listing");
    });

    it("should return 403 when another user tries to update", async () => {
      const createRes = await request(app)
        .post("/cars")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(carData);
      const carId = createRes.body._id;

      const res = await request(app)
        .put(`/cars/${carId}`)
        .set("Authorization", `Bearer ${otherToken}`)
        .send({ title: "Hijacked" });
      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /cars/:id", () => {
    it("should delete a car listing (owner only)", async () => {
      const createRes = await request(app)
        .post("/cars")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(carData);
      const carId = createRes.body._id;

      const res = await request(app)
        .delete(`/cars/${carId}`)
        .set("Authorization", `Bearer ${accessToken}`);
      expect(res.status).toBe(200);

      const getRes = await request(app).get(`/cars/${carId}`);
      expect(getRes.status).toBe(404);
    });

    it("should return 403 when another user tries to delete", async () => {
      const createRes = await request(app)
        .post("/cars")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(carData);
      const carId = createRes.body._id;

      const res = await request(app)
        .delete(`/cars/${carId}`)
        .set("Authorization", `Bearer ${otherToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe("POST /cars/:id/like", () => {
    it("should like a car listing", async () => {
      const createRes = await request(app)
        .post("/cars")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(carData);
      const carId = createRes.body._id;

      const res = await request(app)
        .post(`/cars/${carId}/like`)
        .set("Authorization", `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(true);
      expect(res.body.likesCount).toBe(1);
    });

    it("should unlike a car listing when liked again (toggle)", async () => {
      const createRes = await request(app)
        .post("/cars")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(carData);
      const carId = createRes.body._id;

      await request(app)
        .post(`/cars/${carId}/like`)
        .set("Authorization", `Bearer ${accessToken}`);
      const res = await request(app)
        .post(`/cars/${carId}/like`)
        .set("Authorization", `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(false);
      expect(res.body.likesCount).toBe(0);
    });
  });
});
