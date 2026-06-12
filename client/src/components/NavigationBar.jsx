import { motion } from 'framer-motion';

export default function NavigationBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow flex items-center justify-between px-8 py-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 flex items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600">TM</div>
        <span className="font-bold text-xl text-blue-600">TravelMate</span>
      </div>
      <div className="flex gap-6">
        <a href="#" className="text-gray-700 hover:text-blue-600 font-medium">Home</a>
        <a href="#" className="text-gray-700 hover:text-blue-600 font-medium">Destinations</a>
        <a href="#" className="text-gray-700 hover:text-blue-600 font-medium">Bookings</a>
        <a href="#" className="text-gray-700 hover:text-blue-600 font-medium">Profile</a>
      </div>
      <motion.div whileHover={{ scale: 1.1 }} className="flex items-center gap-2 cursor-pointer">
        <div className="h-8 w-8 flex items-center justify-center rounded-full border bg-gray-200 font-bold text-gray-600">U</div>
        <span className="hidden md:block text-gray-700 font-medium">Hi, User</span>
      </motion.div>
    </nav>
  );
}
