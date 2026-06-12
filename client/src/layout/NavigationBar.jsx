import { motion } from 'framer-motion';

export default function NavigationBar() {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur shadow flex items-center justify-between px-8 py-4">
      <div className="flex items-center gap-2">
        <img src="/public/logo.png" alt="Logo" className="h-9 w-9 rounded-full shadow" />
        <span className="font-extrabold text-2xl text-blue-700 tracking-tight">TravelMate</span>
      </div>
      <div className="flex gap-8">
        <a href="#" className="text-gray-700 hover:text-blue-600 font-semibold transition">Home</a>
        <a href="#" className="text-gray-700 hover:text-blue-600 font-semibold transition">Destinations</a>
        <a href="#" className="text-gray-700 hover:text-blue-600 font-semibold transition">Bookings</a>
        <a href="#" className="text-gray-700 hover:text-blue-600 font-semibold transition">Profile</a>
      </div>
      <motion.div whileHover={{ scale: 1.08 }} className="flex items-center gap-2 cursor-pointer">
        <img src="/public/avatar.png" alt="User" className="h-9 w-9 rounded-full border shadow" />
        <span className="hidden md:block text-gray-700 font-semibold">Hi, User</span>
      </motion.div>
    </nav>
  );
}
