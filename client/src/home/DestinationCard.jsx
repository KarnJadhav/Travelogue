import { motion } from 'framer-motion';

export default function DestinationCard({ image, title, description }) {
  return (
    <motion.div whileHover={{ scale: 1.04 }} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-blue-100 transition">
      <div className="h-56 w-full flex items-center justify-center bg-blue-100 text-2xl font-bold text-blue-700">{title}</div>
      <div className="p-5">
        <h3 className="font-bold text-xl text-blue-700 mb-2">{title}</h3>
        <p className="text-gray-500 mb-4">{description}</p>
        <button className="px-5 py-2 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition">Explore</button>
      </div>
    </motion.div>
  );
}
