/* eslint-disable no-console */
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const Tourist = require('../models/Tourist');
const Guide = require('../models/Guide');
const Tour = require('../models/Tour');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Travelogue = require('../models/Travelogue');
const Hotel = require('../models/Hotel');
const Room = require('../models/Room');
const HotelBooking = require('../models/HotelBooking');
const HotelReview = require('../models/HotelReview');
const RoomInventoryLog = require('../models/RoomInventoryLog');

const DB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  'mongodb://localhost:27017/travel';

const SEED_DOMAIN = 'demo.travel-presentation.local';
const SEED_PASSWORD = 'Demo@1234';

const SAMPLE_MEDIA = {
  avatarGuide1: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=256&q=80',
  avatarGuide2: 'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=256&q=80',
  avatarGuide3: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
  avatarGuide4: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=256&q=80',
  avatarTourist1: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80',
  avatarTourist2: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
  avatarTourist3: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
  avatarTourist4: 'https://images.unsplash.com/photo-1542204625-de293a4fdc12?auto=format&fit=crop&w=256&q=80',
  goa: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1280&q=80',
  jaipur: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1280&q=80',
  himalayas: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1280&q=80',
  varanasi: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1280&q=80',
  kerala: 'https://images.unsplash.com/photo-1593693411515-c20261bcad6e?auto=format&fit=crop&w=1280&q=80',
  rajasthan: 'https://images.unsplash.com/photo-1599661046827-dacde6976540?auto=format&fit=crop&w=1280&q=80',
  hotelBeach: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1280&q=80',
  hotelHeritage: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1280&q=80',
  hotelHill: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1280&q=80',
};

const getMonthInfo = (date) => ({
  year: date.getFullYear(),
  month: date.getMonth(),
  daysInMonth: new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
});

const getSeedMonthInfo = () => {
  const now = new Date();
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    previousMonth: getMonthInfo(previousMonthDate),
    currentMonth: getMonthInfo(currentMonthDate),
  };
};

const toDate = (year, month, day, hour = 12, minute = 0) =>
  new Date(year, month, day, hour, minute, 0, 0);

const clampDay = (day, daysInMonth) => Math.max(1, Math.min(day, daysInMonth));

const pick = (list, index) => list[index % list.length];

const connect = async () => {
  await mongoose.connect(DB_URI);
  console.log('Connected to MongoDB');
};

const removePreviousSeedData = async () => {
  const seedUsers = await User.find({ email: { $regex: `${SEED_DOMAIN}$`, $options: 'i' } })
    .select('_id role')
    .lean();

  if (seedUsers.length === 0) {
    return {
      users: [],
      deleted: {},
    };
  }

  const userIds = seedUsers.map((item) => item._id);
  const guideUserIds = seedUsers.filter((item) => item.role === 'guide').map((item) => item._id);
  const hotelUserIds = seedUsers.filter((item) => item.role === 'hotel').map((item) => item._id);

  const hotelDocs = await Hotel.find({ user: { $in: hotelUserIds } }).select('_id').lean();
  const hotelIds = hotelDocs.map((item) => item._id);

  const tourDocs = await Tour.find({ guideId: { $in: guideUserIds } }).select('_id').lean();
  const tourIds = tourDocs.map((item) => item._id);

  const bookingDocs = await Booking.find({
    $or: [
      { touristId: { $in: userIds } },
      { guideId: { $in: guideUserIds } },
      { sourceTourId: { $in: tourIds } },
    ],
  }).select('_id').lean();
  const bookingIds = bookingDocs.map((item) => item._id);

  const hotelBookingDocs = await HotelBooking.find({
    $or: [
      { touristId: { $in: userIds } },
      { hotelOwnerId: { $in: hotelUserIds } },
      { hotelId: { $in: hotelIds } },
    ],
  }).select('_id').lean();
  const hotelBookingIds = hotelBookingDocs.map((item) => item._id);

  const deleted = {};

  deleted.reviews = (await Review.deleteMany({
    $or: [
      { userId: { $in: userIds } },
      { guideId: { $in: guideUserIds } },
      { bookingId: { $in: bookingIds } },
    ],
  })).deletedCount;

  deleted.hotelReviews = (await HotelReview.deleteMany({
    $or: [
      { touristId: { $in: userIds } },
      { hotelId: { $in: hotelIds } },
      { bookingId: { $in: hotelBookingIds } },
    ],
  })).deletedCount;

  deleted.roomInventoryLogs = (await RoomInventoryLog.deleteMany({
    $or: [
      { bookingId: { $in: hotelBookingIds } },
      { hotelOwnerId: { $in: hotelUserIds } },
    ],
  })).deletedCount;

  deleted.bookings = (await Booking.deleteMany({ _id: { $in: bookingIds } })).deletedCount;
  deleted.hotelBookings = (await HotelBooking.deleteMany({ _id: { $in: hotelBookingIds } })).deletedCount;
  deleted.tours = (await Tour.deleteMany({ _id: { $in: tourIds } })).deletedCount;
  deleted.rooms = (await Room.deleteMany({ hotel: { $in: hotelUserIds } })).deletedCount;
  deleted.travelogues = (await Travelogue.deleteMany({
    $or: [{ userId: { $in: userIds } }, { guideId: { $in: userIds } }],
  })).deletedCount;
  deleted.guides = (await Guide.deleteMany({ userId: { $in: guideUserIds } })).deletedCount;
  deleted.tourists = (await Tourist.deleteMany({ userId: { $in: userIds } })).deletedCount;
  deleted.hotels = (await Hotel.deleteMany({ _id: { $in: hotelIds } })).deletedCount;
  deleted.users = (await User.deleteMany({ _id: { $in: userIds } })).deletedCount;

  return { users: seedUsers, deleted };
};

const run = async () => {
  const { previousMonth, currentMonth } = getSeedMonthInfo();
  const currentMonthStart = new Date(currentMonth.year, currentMonth.month, 1);
  const nextMonthStart = new Date(currentMonth.year, currentMonth.month + 1, 1);

  await connect();

  const previousSeed = await removePreviousSeedData();
  if ((previousSeed.users || []).length > 0) {
    console.log('Removed previous presentation seed data:', previousSeed.deleted);
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const userSeeds = [
    { key: 'tourist_1', name: 'Aarav Mehta', email: `aarav@${SEED_DOMAIN}`, phone: '9876501001', role: 'tourist', avatar: SAMPLE_MEDIA.avatarTourist1, country: 'India', interests: 'Beaches, Food, Culture', createdDay: 2 },
    { key: 'tourist_2', name: 'Diya Nair', email: `diya@${SEED_DOMAIN}`, phone: '9876501002', role: 'tourist', avatar: SAMPLE_MEDIA.avatarTourist2, country: 'India', interests: 'Nature, Wellness, Photography', createdDay: 3 },
    { key: 'tourist_3', name: 'Kunal Singh', email: `kunal@${SEED_DOMAIN}`, phone: '9876501003', role: 'tourist', avatar: SAMPLE_MEDIA.avatarTourist3, country: 'India', interests: 'Adventure, Trekking', createdDay: 4 },
    { key: 'tourist_4', name: 'Riya Sharma', email: `riya@${SEED_DOMAIN}`, phone: '9876501004', role: 'tourist', avatar: SAMPLE_MEDIA.avatarTourist4, country: 'India', interests: 'History, City Walks', createdDay: 5 },
    { key: 'tourist_5', name: 'Dev Patel', email: `dev@${SEED_DOMAIN}`, phone: '9876501005', role: 'tourist', avatar: SAMPLE_MEDIA.avatarTourist1, country: 'India', interests: 'Road Trips, Local Food', createdDay: 6 },
    { key: 'tourist_6', name: 'Neha Joshi', email: `neha@${SEED_DOMAIN}`, phone: '9876501006', role: 'tourist', avatar: SAMPLE_MEDIA.avatarTourist2, country: 'India', interests: 'Art, Architecture', createdDay: 7 },
    { key: 'tourist_7', name: 'Siddharth Rao', email: `sid@${SEED_DOMAIN}`, phone: '9876501007', role: 'tourist', avatar: SAMPLE_MEDIA.avatarTourist3, country: 'India', interests: 'Wildlife, Photography', createdDay: 8 },
    { key: 'tourist_8', name: 'Ira Kulkarni', email: `ira@${SEED_DOMAIN}`, phone: '9876501008', role: 'tourist', avatar: SAMPLE_MEDIA.avatarTourist4, country: 'India', interests: 'Luxury Stays, Spa', createdDay: 9 },
    { key: 'guide_1', name: 'Omkar Deshmukh', email: `omkar.guide@${SEED_DOMAIN}`, phone: '9988802001', role: 'guide', avatar: SAMPLE_MEDIA.avatarGuide1, country: 'India', interests: 'Goa, Heritage, Food', createdDay: 2 },
    { key: 'guide_2', name: 'Farah Khan', email: `farah.guide@${SEED_DOMAIN}`, phone: '9988802002', role: 'guide', avatar: SAMPLE_MEDIA.avatarGuide2, country: 'India', interests: 'Rajasthan, Palaces, Culture', createdDay: 3 },
    { key: 'guide_3', name: 'Arjun Rawat', email: `arjun.guide@${SEED_DOMAIN}`, phone: '9988802003', role: 'guide', avatar: SAMPLE_MEDIA.avatarGuide3, country: 'India', interests: 'Himalayan Treks', createdDay: 4 },
    { key: 'guide_4', name: 'Maya Iyer', email: `maya.guide@${SEED_DOMAIN}`, phone: '9988802004', role: 'guide', avatar: SAMPLE_MEDIA.avatarGuide4, country: 'India', interests: 'Temple Trails, Storytelling', createdDay: 5 },
    { key: 'hotel_1', name: 'Ocean View Hospitality', email: `ocean.hotel@${SEED_DOMAIN}`, phone: '9765403001', role: 'hotel', avatar: '', country: 'India', interests: 'Beach Resort', createdDay: 2 },
    { key: 'hotel_2', name: 'Royal Courtyard Group', email: `royal.hotel@${SEED_DOMAIN}`, phone: '9765403002', role: 'hotel', avatar: '', country: 'India', interests: 'Heritage Hotel', createdDay: 3 },
    { key: 'hotel_3', name: 'Pinecrest Retreats', email: `pine.hotel@${SEED_DOMAIN}`, phone: '9765403003', role: 'hotel', avatar: '', country: 'India', interests: 'Hill Retreat', createdDay: 4 },
  ];

  const userDocs = userSeeds.map((item) => {
    const createdAt = toDate(
      previousMonth.year,
      previousMonth.month,
      clampDay(item.createdDay, previousMonth.daysInMonth),
      11,
      15
    );
    return {
      name: item.name,
      email: item.email,
      password: passwordHash,
      phone: item.phone,
      role: item.role,
      avatar: item.avatar,
      country: item.country,
      interests: item.interests,
      isVerified: true,
      fullName: item.name,
      language: 'English, Hindi',
      nationality: 'Indian',
      createdAt,
      updatedAt: createdAt,
    };
  });

  const createdUsers = await User.insertMany(userDocs, { ordered: true });
  const userByKey = new Map(userSeeds.map((seed, idx) => [seed.key, createdUsers[idx]]));

  const touristProfiles = userSeeds
    .filter((item) => item.role === 'tourist')
    .map((item, idx) => ({
      userId: userByKey.get(item.key)._id,
      fullName: item.name,
      avatar: item.avatar,
      dob: '1998-01-01',
      gender: idx % 2 === 0 ? 'Male' : 'Female',
      language: 'English, Hindi',
      nationality: 'Indian',
      interests: item.interests,
      phone: item.phone,
      createdAt: toDate(previousMonth.year, previousMonth.month, clampDay(item.createdDay, previousMonth.daysInMonth), 12, 20),
      updatedAt: toDate(previousMonth.year, previousMonth.month, clampDay(item.createdDay, previousMonth.daysInMonth), 12, 20),
    }));
  await Tourist.insertMany(touristProfiles, { ordered: true });

  const guideSeeds = [
    {
      key: 'guide_1',
      bio: 'Local Goa storyteller with a passion for hidden beaches and coastal food trails.',
      price: 4800,
      rateType: 'daily',
      languages: [{ name: 'English', level: 'Fluent' }, { name: 'Hindi', level: 'Fluent' }],
      serviceDestinations: [{ destination: 'Goa', price: 4800 }, { destination: 'South Goa', price: 5200 }],
      tourTypes: ['Beach', 'Food', 'Culture'],
      highlights: ['Private sunrise beach walk', 'Street-food tasting', 'Sunset fort viewpoints'],
    },
    {
      key: 'guide_2',
      bio: 'Jaipur specialist focused on royal history, architecture, and local craft stories.',
      price: 5600,
      rateType: 'daily',
      languages: [{ name: 'English', level: 'Fluent' }, { name: 'Hindi', level: 'Fluent' }],
      serviceDestinations: [{ destination: 'Jaipur', price: 5600 }, { destination: 'Udaipur', price: 6200 }],
      tourTypes: ['Heritage', 'Architecture', 'Photography'],
      highlights: ['Palace walk-through', 'Pink City market route', 'Golden-hour photo spots'],
    },
    {
      key: 'guide_3',
      bio: 'Mountain guide for moderate to challenging Himalayan trails and village stays.',
      price: 6900,
      rateType: 'daily',
      languages: [{ name: 'English', level: 'Fluent' }, { name: 'Hindi', level: 'Fluent' }],
      serviceDestinations: [{ destination: 'Manali', price: 6900 }, { destination: 'Kasol', price: 6400 }],
      tourTypes: ['Adventure', 'Trekking', 'Nature'],
      highlights: ['Alpine trek routes', 'Local homestay experiences', 'Campfire evenings'],
    },
    {
      key: 'guide_4',
      bio: 'Cultural guide for Varanasi and spiritual circuits with deep local context.',
      price: 4500,
      rateType: 'daily',
      languages: [{ name: 'English', level: 'Fluent' }, { name: 'Hindi', level: 'Fluent' }],
      serviceDestinations: [{ destination: 'Varanasi', price: 4500 }, { destination: 'Sarnath', price: 4200 }],
      tourTypes: ['Spiritual', 'Heritage', 'Culture'],
      highlights: ['Ghat sunrise boats', 'Temple heritage walk', 'Evening aarti briefing'],
    },
  ];

  const guideDocs = guideSeeds.map((guide, idx) => {
    const createdAt = toDate(previousMonth.year, previousMonth.month, clampDay(6 + idx, previousMonth.daysInMonth), 10, 45);
    return {
      userId: userByKey.get(guide.key)._id,
      bio: guide.bio,
      languages: guide.languages,
      experienceYears: 4 + idx * 2,
      price: guide.price,
      rateType: guide.rateType,
      serviceDestinations: guide.serviceDestinations,
      ratings: 4.6,
      earnings: 0,
      approved: true,
      rejected: false,
      phone: userByKey.get(guide.key).phone,
      tourTypes: guide.tourTypes,
      highlights: guide.highlights,
      cancelPolicy: idx % 2 === 0 ? 'Moderate' : 'Free',
      averageResponseTime: 2 + idx,
      isAvailable: true,
      verifiedPhone: true,
      verifiedID: true,
      verifiedPayment: true,
      acceptManualUpi: true,
      upiId: `guide${idx + 1}@upi`,
      upiPayeeName: userByKey.get(guide.key).name,
      upiQrImage: SAMPLE_MEDIA.goa,
      advancePaymentType: 'percentage',
      advancePaymentValue: 20,
      advancePaymentNotes: 'Advance confirms your slot.',
      createdAt,
      updatedAt: createdAt,
    };
  });
  const createdGuides = await Guide.insertMany(guideDocs, { ordered: true });

  const hotelSeeds = [
    {
      key: 'hotel_1',
      ownerName: 'Rohit Salgaonkar',
      name: 'Azure Sands Resort',
      cityState: 'Goa',
      address: 'Candolim Beach Road, Goa',
      hotelType: 'Resort',
      amenities: ['Pool', 'Beach Access', 'Spa', 'Airport Pickup'],
      images: [SAMPLE_MEDIA.hotelBeach, SAMPLE_MEDIA.goa],
      rooms: [
        { type: 'Deluxe', price: 5200, total: 18 },
        { type: 'Suite', price: 8200, total: 9 },
      ],
    },
    {
      key: 'hotel_2',
      ownerName: 'Sakshi Rathore',
      name: 'Royal Courtyard Heritage',
      cityState: 'Jaipur',
      address: 'Bapu Bazar, Jaipur',
      hotelType: 'Heritage',
      amenities: ['Rooftop Dining', 'City View', 'Live Music', 'Airport Pickup'],
      images: [SAMPLE_MEDIA.hotelHeritage, SAMPLE_MEDIA.rajasthan],
      rooms: [
        { type: 'Standard', price: 3900, total: 20 },
        { type: 'Deluxe', price: 6100, total: 12 },
      ],
    },
    {
      key: 'hotel_3',
      ownerName: 'Amit Negi',
      name: 'Pinecrest Valley Retreat',
      cityState: 'Manali',
      address: 'Old Manali Road, Himachal Pradesh',
      hotelType: 'Boutique',
      amenities: ['Mountain View', 'Bonfire', 'Trek Desk', 'Breakfast'],
      images: [SAMPLE_MEDIA.hotelHill, SAMPLE_MEDIA.himalayas],
      rooms: [
        { type: 'Premium', price: 4700, total: 16 },
        { type: 'Family', price: 7300, total: 8 },
      ],
    },
  ];

  const hotelDocs = hotelSeeds.map((item, idx) => {
    const owner = userByKey.get(item.key);
    const createdAt = toDate(previousMonth.year, previousMonth.month, clampDay(7 + idx, previousMonth.daysInMonth), 13, 0);
    return {
      user: owner._id,
      ownerName: item.ownerName,
      name: item.name,
      email: owner.email,
      phone: owner.phone,
      country: 'India',
      address: item.address,
      cityState: item.cityState,
      hotelType: item.hotelType,
      amenities: item.amenities,
      images: item.images,
      createdAt,
      updatedAt: createdAt,
    };
  });
  const createdHotels = await Hotel.insertMany(hotelDocs, { ordered: true });
  const hotelByKey = new Map(hotelSeeds.map((item, idx) => [item.key, createdHotels[idx]]));

  const roomDocs = [];
  hotelSeeds.forEach((hotelSeed) => {
    const hotelOwner = userByKey.get(hotelSeed.key);
    hotelSeed.rooms.forEach((room) => {
      roomDocs.push({
        hotel: hotelOwner._id,
        type: room.type,
        price: room.price,
        total: room.total,
        available: room.total,
        status: 'Available',
      });
    });
  });
  const createdRooms = await Room.insertMany(roomDocs, { ordered: true });

  const tourSeeds = [
    { guideKey: 'guide_1', title: 'Goa Sunrise & Hidden Beaches', destination: 'Goa', image: SAMPLE_MEDIA.goa, category: 'Beach', meetingPoint: 'Calangute Circle' },
    { guideKey: 'guide_1', title: 'South Goa Cultural Food Trail', destination: 'South Goa', image: SAMPLE_MEDIA.kerala, category: 'Food', meetingPoint: 'Margao Market Gate' },
    { guideKey: 'guide_2', title: 'Jaipur Royal Heritage Walk', destination: 'Jaipur', image: SAMPLE_MEDIA.jaipur, category: 'Heritage', meetingPoint: 'Hawa Mahal Entrance' },
    { guideKey: 'guide_2', title: 'Udaipur Lakes & Palace Stories', destination: 'Udaipur', image: SAMPLE_MEDIA.rajasthan, category: 'Culture', meetingPoint: 'City Palace Parking' },
    { guideKey: 'guide_3', title: 'Manali Alpine Escape', destination: 'Manali', image: SAMPLE_MEDIA.himalayas, category: 'Adventure', meetingPoint: 'Mall Road Taxi Stand' },
    { guideKey: 'guide_3', title: 'Kasol Forest & Riverside Trek', destination: 'Kasol', image: SAMPLE_MEDIA.himalayas, category: 'Nature', meetingPoint: 'Kasol Bridge Point' },
    { guideKey: 'guide_4', title: 'Varanasi Dawn Ghats Tour', destination: 'Varanasi', image: SAMPLE_MEDIA.varanasi, category: 'Spiritual', meetingPoint: 'Dashashwamedh Ghat Gate' },
    { guideKey: 'guide_4', title: 'Sarnath Buddhist Heritage Day', destination: 'Sarnath', image: SAMPLE_MEDIA.varanasi, category: 'History', meetingPoint: 'Sarnath Museum Gate' },
  ];

  const tourDocs = tourSeeds.map((item, idx) => {
    const guide = createdGuides.find((g) => String(g.userId) === String(userByKey.get(item.guideKey)._id));
    const destinationPrice = (guide.serviceDestinations || [])[0]?.price || 5000;
    const startDay = 4 + idx;
    return {
      guideId: userByKey.get(item.guideKey)._id,
      title: item.title,
      shortDescription: `Curated ${item.destination} experience with a verified local guide.`,
      fullDescription: `A premium small-group itinerary in ${item.destination} covering iconic highlights, local experiences, and comfortable pacing for real travelers.`,
      category: item.category,
      destination: item.destination,
      meetingPoint: item.meetingPoint,
      durationType: idx % 3 === 0 ? 'Full day' : 'Half day',
      tourType: idx % 2 === 0 ? 'Group Tour' : 'Private Tour',
      difficultyLevel: idx % 3 === 0 ? 'Moderate' : 'Easy',
      ageRestriction: 'Family-friendly',
      status: 'published',
      media: {
        coverImage: { url: item.image },
        images: [{ url: item.image }, { url: SAMPLE_MEDIA.kerala }],
        videos: [],
        images360: [],
      },
      pricing: {
        currency: 'INR',
        pricePerPerson: destinationPrice,
        groupPricing: destinationPrice * 4,
        couplePricing: Math.round(destinationPrice * 1.8),
        childPricing: Math.round(destinationPrice * 0.7),
        weekendPricing: Math.round(destinationPrice * 1.1),
      },
      schedule: {
        availabilityType: 'custom',
        customDates: [
          toDate(currentMonthStart.getFullYear(), currentMonthStart.getMonth(), clampDay(startDay + 4, 28), 0, 0),
          toDate(currentMonthStart.getFullYear(), currentMonthStart.getMonth(), clampDay(startDay + 11, 28), 0, 0),
          toDate(nextMonthStart.getFullYear(), nextMonthStart.getMonth(), clampDay(startDay + 2, 28), 0, 0),
        ],
        timeSlots: ['Morning', 'Afternoon'],
        minTravelers: 1,
        maxTravelers: 12,
      },
      likesCount: 8 + idx,
      followersCount: 5 + idx,
      createdAt: toDate(previousMonth.year, previousMonth.month, clampDay(10 + idx, previousMonth.daysInMonth), 9, 10),
      updatedAt: toDate(previousMonth.year, previousMonth.month, clampDay(12 + idx, previousMonth.daysInMonth), 17, 35),
    };
  });
  await Tour.insertMany(tourDocs, { ordered: true });

  const touristKeys = userSeeds.filter((item) => item.role === 'tourist').map((item) => item.key);
  const guideKeys = guideSeeds.map((item) => item.key);

  const guideBookings = [];
  const previousMonthGuideStatuses = [
    'completed', 'completed', 'completed', 'completed', 'completed',
    'completed', 'completed', 'completed', 'completed', 'completed',
    'completed', 'completed',
    'confirmed', 'confirmed', 'confirmed',
    'pending', 'pending',
    'cancelled', 'cancelled',
  ];
  const currentMonthGuideStatuses = [
    'completed', 'completed', 'completed', 'completed', 'completed', 'completed',
    'confirmed', 'confirmed', 'confirmed', 'confirmed',
    'pending', 'pending', 'pending', 'pending',
    'cancelled', 'cancelled',
  ];
  const previousMonthDays = [2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17, 18, 19, 21, 22, 24];
  const currentMonthDays = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 18];

  const pushGuideBookingsForMonth = ({ monthInfo, statuses, dayPattern, seedOffset }) => {
    statuses.forEach((status, localIdx) => {
      const idx = seedOffset + localIdx;
      const touristKey = pick(touristKeys, idx);
      const guideKey = pick(guideKeys, idx);
      const guideProfile = createdGuides.find((g) => String(g.userId) === String(userByKey.get(guideKey)._id));
      const destinationEntry = pick(guideProfile.serviceDestinations, idx);
      const day = clampDay(pick(dayPattern, localIdx), monthInfo.daysInMonth);
      const startHour = 8 + (idx % 3);
      const startDateTime = toDate(monthInfo.year, monthInfo.month, day, startHour, 0);
      const endDateTime = toDate(monthInfo.year, monthInfo.month, day, startHour + 8, 0);
      const amount = destinationEntry.price + (idx % 2 === 0 ? 0 : 700);
      const advanceAmount = Math.round(amount * 0.2);
      const isCompleted = status === 'completed';
      const isConfirmed = status === 'confirmed';
      const isPending = status === 'pending';

      guideBookings.push({
        touristId: userByKey.get(touristKey)._id,
        guideId: userByKey.get(guideKey)._id,
        startDateTime,
        endDateTime,
        destination: destinationEntry.destination,
        sourceType: 'guide',
        guestCount: 1 + (idx % 3),
        specialRequests: idx % 4 === 0 ? 'Need local food suggestions' : '',
        price: amount,
        totalAmount: amount,
        advanceAmount,
        remainingAmount: amount - advanceAmount,
        pricingSnapshot: {
          rateType: guideProfile.rateType || 'daily',
          guideRate: amount,
          units: 1,
          unitLabel: 'days',
          destinationLabel: destinationEntry.destination,
          subtotal: amount,
          platformFeeRate: 0,
          platformFeeAmount: 0,
        },
        guidePaymentSnapshot: {
          payeeName: userByKey.get(guideKey).name,
          upiId: `demo.${guideKey}@upi`,
          qrImage: SAMPLE_MEDIA.goa,
          advancePaymentType: 'percentage',
          advancePaymentValue: 20,
        },
        advancePaymentStatus: isPending
          ? (idx % 2 === 0 ? 'awaiting_payment' : 'submitted')
          : (status === 'cancelled' ? 'rejected' : 'verified'),
        advanceSubmittedAt: isPending ? null : toDate(monthInfo.year, monthInfo.month, day, 7, 10),
        advanceVerifiedAt: isCompleted || isConfirmed ? toDate(monthInfo.year, monthInfo.month, day, 7, 40) : null,
        advanceRejectedReason: status === 'cancelled' ? 'Plan changed by tourist.' : '',
        remainingPaymentStatus: isCompleted ? 'paid' : 'pending',
        remainingPaymentMethod: isCompleted ? 'cash' : '',
        remainingPaidAt: isCompleted ? toDate(monthInfo.year, monthInfo.month, day, 18, 30) : null,
        paymentWindowExpiresAt: isPending ? toDate(monthInfo.year, monthInfo.month, day, startHour + 2, 0) : null,
        status,
        reviewRequestSent: isCompleted,
        reviewRequestMessage: isCompleted ? 'Please share your experience.' : '',
        reviewRequestStatus: isCompleted ? 'accepted' : '',
        canLeaveReview: isCompleted,
        reviewSubmitted: isCompleted && idx % 3 !== 0,
        createdAt: toDate(monthInfo.year, monthInfo.month, clampDay(day - 2, monthInfo.daysInMonth), 12, 0),
        updatedAt: toDate(monthInfo.year, monthInfo.month, clampDay(day, monthInfo.daysInMonth), 20, 0),
      });
    });
  };

  pushGuideBookingsForMonth({
    monthInfo: previousMonth,
    statuses: previousMonthGuideStatuses,
    dayPattern: previousMonthDays,
    seedOffset: 0,
  });
  pushGuideBookingsForMonth({
    monthInfo: currentMonth,
    statuses: currentMonthGuideStatuses,
    dayPattern: currentMonthDays,
    seedOffset: previousMonthGuideStatuses.length,
  });
  const createdGuideBookings = await Booking.insertMany(guideBookings, { ordered: true });

  const reviewComments = [
    'Very well organized and friendly guide.',
    'Great storytelling and smooth planning throughout.',
    'Felt safe and learned many local insights.',
    'Excellent pace, food stops, and hidden places.',
    'Would definitely book this guide again.',
  ];

  const completedGuideBookings = createdGuideBookings.filter((item) => item.status === 'completed');
  const guideReviews = completedGuideBookings.slice(0, 18).map((booking, idx) => ({
    userId: booking.touristId,
    guideId: booking.guideId,
    bookingId: booking._id,
    place: booking.destination || 'Local Tour',
    rating: 4 + (idx % 2),
    comment: pick(reviewComments, idx),
    status: 'approved',
    isHidden: false,
    isDeleted: false,
    createdAt: new Date(booking.endDateTime.getTime() + (1000 * 60 * 60 * 18)),
    updatedAt: new Date(booking.endDateTime.getTime() + (1000 * 60 * 60 * 18)),
  }));
  await Review.insertMany(guideReviews, { ordered: true });

  const hotelBookings = [];
  const previousMonthHotelStatuses = [
    'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed',
    'completed', 'completed', 'completed', 'completed', 'completed',
    'confirmed', 'confirmed', 'pending', 'cancelled',
  ];
  const currentMonthHotelStatuses = [
    'completed', 'completed', 'completed', 'completed', 'completed',
    'confirmed', 'confirmed', 'confirmed', 'confirmed',
    'checked_in', 'checked_in',
    'pending', 'pending', 'pending',
    'cancelled', 'cancelled',
  ];
  const previousMonthHotelDays = [2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 14, 15, 18, 19, 22, 24];
  const currentMonthHotelDays = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 14, 15, 16, 18, 20];

  const pushHotelBookingsForMonth = ({ monthInfo, statuses, dayPattern, seedOffset }) => {
    statuses.forEach((status, localIdx) => {
      const idx = seedOffset + localIdx;
      const hotelSeed = pick(hotelSeeds, idx);
      const hotelDoc = hotelByKey.get(hotelSeed.key);
      const hotelOwner = userByKey.get(hotelSeed.key);
      const tourist = userByKey.get(pick(touristKeys, idx + 1));
      const roomConfig = pick(hotelSeed.rooms, idx);
      const roomCount = 1 + (idx % 2);
      const day = clampDay(pick(dayPattern, localIdx), monthInfo.daysInMonth);
      const nights = 1 + (idx % 3);
      const checkIn = toDate(monthInfo.year, monthInfo.month, day, 0, 0);
      const checkOut = toDate(
        monthInfo.year,
        monthInfo.month,
        clampDay(day + nights, monthInfo.daysInMonth),
        0,
        0
      );
      const effectiveNights = Math.max(1, Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
      const totalAmount = roomConfig.price * roomCount * effectiveNights;

      hotelBookings.push({
        touristId: tourist._id,
        hotelId: hotelDoc._id,
        hotelOwnerId: hotelOwner._id,
        checkIn,
        checkOut,
        guests: Math.min(5, roomCount + 1 + (idx % 2)),
        roomCount,
        roomType: roomConfig.type,
        roomReserved: status !== 'cancelled',
        notes: status === 'pending' ? 'Requested early check-in.' : '',
        status,
        pricePerNight: roomConfig.price,
        totalAmount: status === 'cancelled' ? 0 : totalAmount,
        createdAt: toDate(
          monthInfo.year,
          monthInfo.month,
          clampDay(day - 3, monthInfo.daysInMonth),
          11,
          30
        ),
        updatedAt: status === 'completed'
          ? new Date(checkOut.getTime() + (1000 * 60 * 60 * 2))
          : toDate(
              monthInfo.year,
              monthInfo.month,
              clampDay(day - 1, monthInfo.daysInMonth),
              19,
              0
            ),
      });
    });
  };

  pushHotelBookingsForMonth({
    monthInfo: previousMonth,
    statuses: previousMonthHotelStatuses,
    dayPattern: previousMonthHotelDays,
    seedOffset: 0,
  });
  pushHotelBookingsForMonth({
    monthInfo: currentMonth,
    statuses: currentMonthHotelStatuses,
    dayPattern: currentMonthHotelDays,
    seedOffset: previousMonthHotelStatuses.length,
  });
  const createdHotelBookings = await HotelBooking.insertMany(hotelBookings, { ordered: true });

  const completedHotelBookings = createdHotelBookings.filter((booking) => booking.status === 'completed');
  const hotelReviewComments = [
    'Room was clean, staff was polite, and location was perfect.',
    'Great breakfast and smooth check-in experience.',
    'Very comfortable stay for family trip.',
    'Good value for money and beautiful ambience.',
    'Will recommend this hotel for weekend trips.',
  ];

  const hotelReviews = completedHotelBookings.slice(0, 20).map((booking, idx) => ({
    touristId: booking.touristId,
    hotelId: booking.hotelId,
    bookingId: booking._id,
    rating: 4 + (idx % 2),
    comment: pick(hotelReviewComments, idx),
    status: 'approved',
    isHidden: false,
    isDeleted: false,
    createdAt: new Date(booking.checkOut.getTime() + (1000 * 60 * 60 * 8)),
    updatedAt: new Date(booking.checkOut.getTime() + (1000 * 60 * 60 * 8)),
  }));
  await HotelReview.insertMany(hotelReviews, { ordered: true });

  const storyDestinations = ['Goa', 'Jaipur', 'Manali', 'Varanasi', 'Kerala', 'Udaipur', 'Sarnath', 'Kasol'];
  const storyMediaPool = [
    SAMPLE_MEDIA.goa,
    SAMPLE_MEDIA.jaipur,
    SAMPLE_MEDIA.himalayas,
    SAMPLE_MEDIA.varanasi,
    SAMPLE_MEDIA.kerala,
    SAMPLE_MEDIA.rajasthan,
  ];
  const storyTitlePrefixes = [
    'Weekend Escape',
    'Local Culture Notes',
    'Hidden Spot Journal',
    'Sunrise to Sunset Story',
    'Budget Trip Diary',
    'Family Travel Notes',
    'Backpack Route',
    'Food & Walk Chronicle',
  ];
  const storyCommentPool = [
    'Amazing route and very useful details.',
    'Saving this for my next trip.',
    'Loved the storytelling and photos.',
    'Great practical tips for first-time visitors.',
  ];

  const buildStoryComments = (idx, monthInfo, day) =>
    Array.from({ length: idx % 3 }, (_, commentIdx) => ({
      userId: userByKey.get(pick(touristKeys, idx + commentIdx + 1))._id,
      userName: userByKey.get(pick(touristKeys, idx + commentIdx + 1)).name,
      userAvatar: userByKey.get(pick(touristKeys, idx + commentIdx + 1)).avatar || '',
      text: pick(storyCommentPool, idx + commentIdx),
      replies: [],
      createdAt: toDate(monthInfo.year, monthInfo.month, day, 21, 0 + (commentIdx * 10)),
    }));

  const travelogueDocs = Array.from({ length: 50 }, (_, idx) => {
    const monthInfo = idx < 25 ? previousMonth : currentMonth;
    const localIndex = idx < 25 ? idx : idx - 25;
    const day = clampDay(1 + localIndex, monthInfo.daysInMonth);
    const destination = pick(storyDestinations, idx);
    const owner = userByKey.get(pick(touristKeys, idx));
    const guide = userByKey.get(pick(guideKeys, idx));
    const image = pick(storyMediaPool, idx);
    const duration = 2 + (idx % 3);
    const startDate = toDate(monthInfo.year, monthInfo.month, day, 8, 0);
    const endDate = toDate(monthInfo.year, monthInfo.month, clampDay(day + duration - 1, monthInfo.daysInMonth), 20, 0);
    const likes = Array.from({ length: 2 + (idx % 5) }, (_, likeIdx) => ({
      userId: userByKey.get(pick(touristKeys, idx + likeIdx))._id,
      createdAt: toDate(monthInfo.year, monthInfo.month, day, 18, likeIdx * 4),
    }));
    const saves = Array.from({ length: 1 + (idx % 3) }, (_, saveIdx) => ({
      userId: userByKey.get(pick(touristKeys, idx + saveIdx + 2))._id,
      createdAt: toDate(monthInfo.year, monthInfo.month, day, 19, saveIdx * 6),
    }));
    const comments = buildStoryComments(idx, monthInfo, day);
    const createdAt = toDate(monthInfo.year, monthInfo.month, day, 17, 20);
    const approvedAt = toDate(monthInfo.year, monthInfo.month, day, 21, 10);

    return {
      title: `${pick(storyTitlePrefixes, idx)} - ${destination} #${idx + 1}`,
      description: `Story ${idx + 1}: realistic traveler notes from ${destination}, including route planning, stays, food spots, and timing tips for a smooth trip.`,
      images: [image],
      userId: owner._id,
      guideId: guide._id,
      location: destination,
      destination,
      status: 'approved',
      rating: 4 + ((idx % 4) * 0.25),
      tags: ['story', 'presentation', destination.toLowerCase()],
      startDate,
      endDate,
      duration,
      travelersCount: 1 + (idx % 4),
      estimatedCost: 12000 + (idx * 850),
      difficulty: idx % 2 === 0 ? 'easy' : 'moderate',
      season: 'Summer',
      highlights: ['Scenic viewpoint', 'Local cuisine', 'Cultural interaction'],
      views: 110 + (idx * 14),
      likes,
      saves,
      comments,
      shares: 8 + (idx % 14),
      publishedAt: approvedAt,
      approvedAt,
      createdAt,
      updatedAt: approvedAt,
    };
  });
  await Travelogue.insertMany(travelogueDocs, { ordered: true });

  const guideReviewAgg = await Review.aggregate([
    { $match: { guideId: { $in: guideDocs.map((_, idx) => createdGuides[idx].userId) }, isDeleted: { $ne: true }, status: { $ne: 'rejected' } } },
    { $group: { _id: '$guideId', avgRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
  ]);
  const ratingMap = new Map(guideReviewAgg.map((item) => [String(item._id), Number((item.avgRating || 4.5).toFixed(1))]));

  const earningsAgg = await Booking.aggregate([
    { $match: { guideId: { $in: createdGuides.map((g) => g.userId) }, status: 'completed' } },
    { $group: { _id: '$guideId', earnings: { $sum: '$totalAmount' }, lastBookingDate: { $max: '$endDateTime' } } },
  ]);
  const earningsMap = new Map(earningsAgg.map((item) => [String(item._id), { earnings: item.earnings || 0, lastBookingDate: item.lastBookingDate || null }]));

  for (const guide of createdGuides) {
    const key = String(guide.userId);
    const earn = earningsMap.get(key) || { earnings: 0, lastBookingDate: null };
    await Guide.updateOne(
      { _id: guide._id },
      {
        $set: {
          ratings: ratingMap.get(key) || 4.5,
          earnings: earn.earnings,
          lastBookingDate: earn.lastBookingDate,
        },
      }
    );
  }

  const activeRoomReserved = await HotelBooking.aggregate([
    {
      $match: {
        status: { $in: ['pending', 'confirmed', 'checked_in'] },
        roomReserved: true,
        roomType: { $nin: [null, ''] },
      },
    },
    {
      $group: {
        _id: { hotelOwnerId: '$hotelOwnerId', roomType: '$roomType' },
        reservedRooms: { $sum: '$roomCount' },
      },
    },
  ]);
  const reservedMap = new Map(
    activeRoomReserved.map((item) => [`${String(item._id.hotelOwnerId)}::${item._id.roomType}`, item.reservedRooms || 0])
  );

  for (const room of createdRooms) {
    const reserved = reservedMap.get(`${String(room.hotel)}::${room.type}`) || 0;
    const available = Math.max(0, (room.total || 0) - reserved);
    const status = available <= 0 ? 'Full' : 'Available';
    await Room.updateOne({ _id: room._id }, { $set: { available, status } });
  }

  console.log('Presentation seed completed successfully.');
  console.log('Login password for seeded users:', SEED_PASSWORD);
  console.log('Seeded counts:', {
    users: createdUsers.length,
    touristProfiles: touristProfiles.length,
    guides: createdGuides.length,
    hotels: createdHotels.length,
    rooms: createdRooms.length,
    tours: tourDocs.length,
    guideBookings: createdGuideBookings.length,
    guideReviews: guideReviews.length,
    hotelBookings: createdHotelBookings.length,
    hotelReviews: hotelReviews.length,
    travelogues: travelogueDocs.length,
  });
};

run()
  .catch((error) => {
    console.error('Presentation seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
