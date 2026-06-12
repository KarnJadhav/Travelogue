// ...existing code...
import { motion } from 'framer-motion';

export default function MetricsCard({ title, value, icon, color }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`flex items-center gap-4 p-4 rounded-lg shadow bg-white border-l-4 ${color}`}
    >
      <div className="text-3xl">{icon}</div>
      <div>
        <div className="text-gray-500 text-sm">{title}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </motion.div>
  );
}
