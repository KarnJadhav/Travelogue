const express = require("express");
const router = express.Router();
const Room = require("../models/Room");
const { verifyToken } = require("../middleware/auth");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Get all rooms for a specific hotel
router.get("/hotel/:hotelId", verifyToken, async (req, res) => {
  try {
    const rooms = await Room.find({ hotel: req.params.hotelId });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dedupe room types for a hotel (keep latest, remove duplicates)
router.post("/hotel/:hotelId/dedupe", verifyToken, async (req, res) => {
  try {
    const { hotelId } = req.params;
    if (!req.user || req.user.userId !== hotelId) {
      return res.status(403).json({ message: "Forbidden." });
    }
    const rooms = await Room.find({ hotel: hotelId }).sort({ updatedAt: -1, createdAt: -1 });
    const groups = new Map();
    rooms.forEach((room) => {
      const key = (room.type || "").trim().toLowerCase();
      if (!key) return;
      if (!groups.has(key)) {
        groups.set(key, { primary: room, duplicates: [] });
      } else {
        groups.get(key).duplicates.push(room);
      }
    });

    let removed = 0;
    for (const entry of groups.values()) {
      if (entry.duplicates.length) {
        const ids = entry.duplicates.map((room) => room._id);
        const result = await Room.deleteMany({ _id: { $in: ids } });
        removed += result.deletedCount || 0;
      }
    }

    res.json({ message: "Room types deduped.", kept: groups.size, removed });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Add a new room for a hotel
router.post("/hotel/:hotelId", verifyToken, async (req, res) => {
  try {
    const { type, price, total, available, status } = req.body;
    const cleanType = typeof type === "string" ? type.trim() : "";
    if (!cleanType) {
      return res.status(400).json({ message: "Room type is required." });
    }
    if (price === undefined || price === null || price === "") {
      return res.status(400).json({ message: "Room price is required." });
    }
    if (total === undefined || total === null || total === "") {
      return res.status(400).json({ message: "Total rooms is required." });
    }

    const priceValue = Number(price);
    if (Number.isNaN(priceValue)) {
      return res.status(400).json({ message: "Invalid room price." });
    }
    const totalValue = Math.max(0, Number(total) || 0);
    const hasAvailable = available !== undefined && available !== null && available !== "";
    const availableValue = Math.min(
      Math.max(0, Number(hasAvailable ? available : totalValue) || 0),
      totalValue
    );

    const requestedStatus = typeof status === "string" ? status.trim() : "";
    const normalizedStatus = ["Available", "Full", "Unavailable"].includes(requestedStatus)
      ? requestedStatus
      : "";
    const finalStatus =
      normalizedStatus === "Unavailable"
        ? "Unavailable"
        : availableValue <= 0
        ? "Full"
        : "Available";

    const typeRegex = new RegExp(`^${escapeRegex(cleanType)}$`, "i");
    const existing = await Room.findOne({ hotel: req.params.hotelId, type: { $regex: typeRegex } });
    if (existing) {
      existing.type = cleanType;
      existing.price = priceValue;
      existing.total = totalValue;
      existing.available = availableValue;
      existing.status = finalStatus;
      await existing.save();
      await Room.deleteMany({
        hotel: req.params.hotelId,
        _id: { $ne: existing._id },
        type: { $regex: typeRegex }
      });
      try {
        const setupSocket = require("../socket/chat");
        const io = setupSocket.ioInstance;
        if (io) {
          io.to(`hotel_${req.params.hotelId}`).emit("hotelRoomUpdate", {
            hotelId: req.params.hotelId,
            room: existing
          });
          io.emit("hotelRoomUpdatePublic", {
            hotelId: req.params.hotelId,
            room: existing
          });
        }
      } catch (e) {
        console.log("[DEBUG] Socket emit error (room update):", e);
      }
      return res.json(existing);
    }

    const room = new Room({
      hotel: req.params.hotelId,
      type: cleanType,
      price: priceValue,
      total: totalValue,
      available: availableValue,
      status: finalStatus
    });
    await room.save();
    try {
      const setupSocket = require("../socket/chat");
      const io = setupSocket.ioInstance;
      if (io) {
        io.to(`hotel_${req.params.hotelId}`).emit("hotelRoomUpdate", {
          hotelId: req.params.hotelId,
          room
        });
        io.emit("hotelRoomUpdatePublic", {
          hotelId: req.params.hotelId,
          room
        });
      }
    } catch (e) {
      console.log("[DEBUG] Socket emit error (room create):", e);
    }
    res.status(201).json(room);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a room
router.put("/:roomId", verifyToken, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found." });
    }
    const nextType =
      req.body.type !== undefined ? String(req.body.type || "").trim() : room.type;
    if (!nextType) {
      return res.status(400).json({ message: "Room type is required." });
    }
    const typeRegex = new RegExp(`^${escapeRegex(nextType)}$`, "i");
    const duplicateRooms = await Room.find({
      hotel: room.hotel,
      _id: { $ne: room._id },
      type: { $regex: typeRegex }
    });

    const nextTotal =
      req.body.total !== undefined && req.body.total !== ""
        ? Number(req.body.total)
        : Number(room.total) || 0;
    if (Number.isNaN(nextTotal)) {
      return res.status(400).json({ message: "Invalid total rooms value." });
    }
    const nextAvailableRaw =
      req.body.available !== undefined && req.body.available !== ""
        ? Number(req.body.available)
        : Number(room.available) || 0;
    if (Number.isNaN(nextAvailableRaw)) {
      return res.status(400).json({ message: "Invalid available rooms value." });
    }
    const nextAvailable = Math.min(Math.max(0, nextAvailableRaw), Math.max(0, nextTotal));

    const requestedStatus =
      req.body.status !== undefined ? String(req.body.status).trim() : room.status;
    const normalizedStatus = ["Available", "Full", "Unavailable"].includes(requestedStatus)
      ? requestedStatus
      : room.status;
    const finalStatus =
      normalizedStatus === "Unavailable"
        ? "Unavailable"
        : nextAvailable <= 0
        ? "Full"
        : "Available";

    if (req.body.price !== undefined && req.body.price !== "") {
      const priceValue = Number(req.body.price);
      if (Number.isNaN(priceValue)) {
        return res.status(400).json({ message: "Invalid room price." });
      }
      room.price = priceValue;
    }
    room.type = nextType;
    room.total = nextTotal;
    room.available = nextAvailable;
    room.status = finalStatus;
    await room.save();
    if (duplicateRooms.length) {
      const ids = duplicateRooms.map((item) => item._id);
      await Room.deleteMany({ _id: { $in: ids } });
    }
    if (room) {
      try {
        const setupSocket = require("../socket/chat");
        const io = setupSocket.ioInstance;
        if (io) {
          io.to(`hotel_${room.hotel.toString()}`).emit("hotelRoomUpdate", {
            hotelId: room.hotel.toString(),
            room
          });
          io.emit("hotelRoomUpdatePublic", {
            hotelId: room.hotel.toString(),
            room
          });
        }
      } catch (e) {
        console.log("[DEBUG] Socket emit error (room update):", e);
      }
    }
    res.json(room);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a room
router.delete("/:roomId", verifyToken, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    await Room.findByIdAndDelete(req.params.roomId);
    if (room) {
      try {
        const setupSocket = require("../socket/chat");
        const io = setupSocket.ioInstance;
        if (io) {
          io.to(`hotel_${room.hotel.toString()}`).emit("hotelRoomUpdate", {
            hotelId: room.hotel.toString(),
            roomId: room._id.toString(),
            deleted: true
          });
          io.emit("hotelRoomUpdatePublic", {
            hotelId: room.hotel.toString(),
            roomId: room._id.toString(),
            deleted: true
          });
        }
      } catch (e) {
        console.log("[DEBUG] Socket emit error (room delete):", e);
      }
    }
    res.json({ message: "Room deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
