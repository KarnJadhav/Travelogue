import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 flex flex-col">
      <div className="relative h-[400px] flex items-center justify-center">
        <img src="https://via.placeholder.com/1200x400?text=Travel+Hero" alt="Travel Hero Placeholder" className="absolute inset-0 w-full h-full object-cover opacity-70" />
        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow mb-4">Find Your Next Adventure</h1>
          <p className="text-lg md:text-2xl text-white mb-6">Book guides, explore travelogues, and discover amazing places.</p>
          <input type="text" placeholder="Search destinations..." className="px-6 py-3 rounded-full w-80 max-w-full shadow focus:outline-none" />
        </motion.div>
      </div>
      <div className="max-w-6xl mx-auto py-12 px-4">
        <h2 className="text-2xl font-bold mb-6 text-blue-700">Popular Destinations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {["Paris", "Goa", "New York"].map((place, i) => (
            <motion.div key={place} whileHover={{ scale: 1.05 }} className="bg-white rounded-xl shadow-lg overflow-hidden">
              <img src={`https://via.placeholder.com/400x200?text=${encodeURIComponent(place)}`} alt={`${place} Destination Placeholder`} className="h-48 w-full object-cover" />
              <div className="p-4">
                <h3 className="font-bold text-lg text-blue-600">{place}</h3>
                <p className="text-gray-500">Explore the beauty of {place} with top guides and curated travelogues.</p>
                <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Explore</button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
