import { motion } from 'framer-motion';

export default function LandingHero() {
  return (
    <div className="relative h-[420px] flex items-center justify-center overflow-hidden rounded-b-3xl shadow-xl">
      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-blue-200 opacity-80 scale-105 text-6xl font-extrabold text-blue-700">TRAVEL HERO</div>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative z-10 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold text-white drop-shadow mb-4 tracking-tight">Find Your Next Adventure</h1>
        <p className="text-xl md:text-2xl text-white mb-8 font-medium">Book guides, explore travelogues, and discover amazing places.</p>
        <input type="text" placeholder="Search destinations..." className="px-8 py-4 rounded-full w-96 max-w-full shadow-lg focus:outline-none text-lg" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 to-transparent" />
    </div>
  );
}
