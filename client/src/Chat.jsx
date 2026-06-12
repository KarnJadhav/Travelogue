import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { SOCKET_BASE_URL } from './config/runtime';

const socket = io(SOCKET_BASE_URL);

function Chat({ bookingId, userId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.emit('joinRoom', { bookingId });
    socket.on('newMessage', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => {
      socket.off('newMessage');
    };
  }, [bookingId]);

  const sendMessage = () => {
    if (input.trim()) {
      socket.emit('chatMessage', {
        bookingId,
        senderId: userId,
        content: input
      });
      setInput('');
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={msg.sender === userId ? 'my-message' : 'other-message'}>
            <span>{msg.text}</span>
            <small>{new Date(msg.sentAt).toLocaleTimeString()}</small>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default Chat;
