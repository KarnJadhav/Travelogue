import { motion } from 'framer-motion';

export default function NavigationMenu({ items, onSelect, selected }) {
  return (
    <nav className="flex gap-4 mb-6">
      {items.map((item) => (
        <motion.button
          key={item}
          whileTap={{ scale: 0.95 }}
          className={`px-4 py-2 rounded transition font-semibold ${selected === item ? 'bg-blue-600 text-white' : 'bg-white border'}`}
          onClick={() => onSelect(item)}
        >
          {item}
        </motion.button>
      ))}
    </nav>
  );
}
