import { prisma } from "@/config";

async function findHotels() {
  return prisma.hotel.findMany();
}

async function findRoomsByHotelId(hotelId: number) {
  return prisma.hotel.findFirst({
    where: {
      id: hotelId,
    },
    include: {
      Rooms: true,
    },
  });
}

async function findAllHotelsWithRooms() {
  return prisma.hotel.findMany({
    include: {
      Rooms: { include: { Booking: true } },
    },
  });
}

const hotelRepository = {
  findHotels,
  findRoomsByHotelId,
  findAllHotelsWithRooms,
};

export default hotelRepository;
