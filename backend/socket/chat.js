const socketio = require('socket.io');
const Booking = require('../models/Booking');
const Chat = require('../models/Chat');

// Track online guides globally
const onlineGuides = new Map(); // { guideId: { socketId, connectedAt } }

function setupSocket(server) {
  const io = socketio(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });
  setupSocket.ioInstance = io;

  // Broadcast online guides status to all connected clients
  const broadcastGuideStatus = (guideId, isOnline) => {
    io.emit('guideOnlineStatus', {
      guideId,
      isOnline,
      timestamp: new Date()
    });
  };

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // When a guide connects
    socket.on('guideOnline', ({ guideId }) => {
      onlineGuides.set(guideId, {
        socketId: socket.id,
        connectedAt: new Date()
      });
      console.log(`Guide ${guideId} is ONLINE`);
      broadcastGuideStatus(guideId, true);
    });

    // For chat rooms (per Chat model, guide-tourist pair)

    // Join chat room by chatId (for direct chat)
    socket.on('joinRoom', async ({ chatId, userId }) => {
      const chat = await Chat.findById(chatId);
      if (chat && (chat.touristId.toString() === userId || chat.guideId.toString() === userId)) {
        socket.join(`chat_${chatId}`);
        
        // Check if the other user is online and emit status
        const otherUserId = chat.touristId.toString() === userId ? chat.guideId.toString() : chat.touristId.toString();
        const isOnline = onlineGuides.has(otherUserId);
        socket.emit('guideOnlineStatus', {
          guideId: otherUserId,
          isOnline,
          timestamp: new Date()
        });
      }
    });

    // Typing indicator
    socket.on('typing', ({ chatId, userId }) => {
      socket.to(`chat_${chatId}`).emit('userTyping', { userId });
    });

    // Stop typing indicator
    socket.on('stopTyping', ({ chatId, userId }) => {
      socket.to(`chat_${chatId}`).emit('userStoppedTyping', { userId });
    });

    // Send chat message (with access and status enforcement)
    // Socket event for receiving messages (for backward compatibility / mobile clients)
    // Note: Messages are primarily created via REST API which broadcasts them
    socket.on('chatMessage', async ({ chatId, senderId, content, messageType = 'TEXT', senderRole }) => {
      // This handler is kept for backward compatibility but primarily
      // messages are created via REST API endpoint which broadcasts via socket
      // To prevent duplicates, we don't create here - API handles it
      console.log('[SOCKET] chatMessage received but creation handled by API');
    });

    // Message read receipt
    socket.on('messageRead', async ({ chatId, messageId }) => {
      const Message = require('../models/Message');
      await Message.findByIdAndUpdate(messageId, { isRead: true, readAt: new Date() });
      io.to(`chat_${chatId}`).emit('messageRead', { 
        messageId, 
        readAt: new Date() 
      });
    });

    // For guide dashboard real-time booking updates
    socket.on('joinGuideRoom', ({ guideId }) => {
      if (guideId) {
        socket.join(`guide_${guideId}`);
      }
    });

    // For tourist dashboard real-time booking updates
    socket.on('joinTouristRoom', ({ touristId }) => {
      if (touristId) {
        socket.join(`tourist_${touristId}`);
      }
    });

    // When user disconnects
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      
      // Find if this was a guide and mark as offline
      for (let [guideId, data] of onlineGuides.entries()) {
        if (data.socketId === socket.id) {
          onlineGuides.delete(guideId);
          console.log(`Guide ${guideId} is OFFLINE`);
          broadcastGuideStatus(guideId, false);
          break;
        }
      }
    });
  });

  // Expose a function to emit booking updates to a guide
  io.emitBookingUpdate = (guideId, booking) => {
    if (guideId) {
      io.to(`guide_${guideId}`).emit('bookingUpdate', { guideId, booking });
    }
    if (booking && booking.touristId) {
      io.to(`tourist_${booking.touristId.toString()}`).emit('bookingUpdate', { touristId: booking.touristId.toString(), booking });
    }
  };

  // Get all online guides
  io.getOnlineGuides = () => {
    return Array.from(onlineGuides.keys());
  };
}

module.exports = setupSocket;
