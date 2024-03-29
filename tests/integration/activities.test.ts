import app, { init } from "@/app";
import faker from "@faker-js/faker";
import httpStatus from "http-status";
import { TicketStatus } from "@prisma/client";
import supertest from "supertest";
import { createEnrollmentWithAddress, createHotel, createPayment, createRoomWithHotelId, createTicket, createTicketTypeWithHotel, createUser } from "../factories";
import { cleanDb, generateValidToken } from "../helpers";
import * as jwt from "jsonwebtoken";
import { createActivity } from "../factories/activities-factory";

beforeAll(async () => {
  await init();
  await cleanDb();
});

beforeEach(async () => {
  await cleanDb();
});

const server = supertest(app);

describe("GET /activities is invalid", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.get("/activities");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.get("/activities").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.get("/activities").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });
});

describe("GET /activities when token is valid", () => {
  it("should return 404 when user has no enrollment ", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);

    const response = await server.get("/activities").set("Authorization", `Bearer ${token}`);

    expect(response.status).toEqual(httpStatus.NOT_FOUND);
  });

  it("should return 200 when user has enrollment", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithHotel();
    const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    await createPayment(ticket.id, ticketType.price);

    const hotel = await createHotel();
    await createRoomWithHotelId(hotel.id);

    const response = await server.get("/activities").set("Authorization", `Bearer ${token}`);

    expect(response.status).toEqual(httpStatus.OK);
  });

  it("should return 422 for ticket with RESERVED status", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithHotel();
    const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);
    await createPayment(ticket.id, ticketType.price);

    const hotel = await createHotel();
    await createRoomWithHotelId(hotel.id);

    const response = await server.get("/activities").set("Authorization", `Bearer ${token}`);

    expect(response.status).toEqual(httpStatus.PAYMENT_REQUIRED);
  });
});

describe("POST /activities when token is valid", () => {
  it("should return status 200 when activity created for user", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithHotel();
    const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    await createPayment(ticket.id, ticketType.price);

    const hotel = await createHotel();
    await createRoomWithHotelId(hotel.id);

    const activity = await createActivity();

    const response = await server.post("/activities").set("Authorization", `Bearer ${token}`).send({ activityId: activity.id });

    expect(response.status).toEqual(httpStatus.OK);
    expect(response.body).toEqual({
      id: expect.any(Number),
      day: expect.any(String),
      startsAt: expect.any(String),
      endsAt: expect.any(String),
      userId: expect.any(Number),
      activityId: expect.any(Number),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it("should return 409 when the user is already linked to an activity", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithHotel();
    const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    await createPayment(ticket.id, ticketType.price);

    const hotel = await createHotel();
    await createRoomWithHotelId(hotel.id);

    const activity = await createActivity();

    await server.post("/activities").set("Authorization", `Bearer ${token}`).send({ activityId: activity.id });
    const response = await server.post("/activities").set("Authorization", `Bearer ${token}`).send({ activityId: activity.id });

    expect(response.status).toEqual(httpStatus.CONFLICT);
  });

  it("should return 400 when the id passed by the body does not exist", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithHotel();
    const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    await createPayment(ticket.id, ticketType.price);

    const hotel = await createHotel();
    await createRoomWithHotelId(hotel.id);

    await createActivity();

    const response = await server.post("/activities").set("Authorization", `Bearer ${token}`).send({ activityId: 589375489347683 });

    expect(response.status).toEqual(httpStatus.BAD_REQUEST);
  });
});
