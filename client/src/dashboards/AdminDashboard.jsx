import MetricsCard from '../components/MetricsCard';
import NavigationMenu from '../components/NavigationMenu';
import ReviewModeration from './components/ReviewModeration';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../api';



export default function AdminDashboard() {
  const [tab, setTab] = useState('Dashboard');
  const [metrics, setMetrics] = useState([
    { title: 'Total Users', value: 0, icon: '👥', color: 'border-blue-500' },
    { title: 'Guides', value: 0, icon: '🧑‍💼', color: 'border-green-500' },
    { title: 'Travelogues', value: 0, icon: '📖', color: 'border-yellow-500' },
  ]);
  const [guides, setGuides] = useState([]);
  const [travelogues, setTravelogues] = useState([]);

  useEffect(() => {
    // Fetch guides (pending and approved)
    api.get('/adminGuide/pending')
      .then(res => {
        setGuides(res.data.guides || []);
        setMetrics(m => m.map(metric =>
          metric.title === 'Guides' ? { ...metric, value: res.data.guides?.length || 0 } : metric
        ));
      })
      .catch(() => {});
    // Fetch travelogues
    api.get('/approvedTravelogues')
      .then(res => {
        setTravelogues(res.data.travelogues || []);
        setMetrics(m => m.map(metric =>
          metric.title === 'Travelogues' ? { ...metric, value: res.data.travelogues?.length || 0 } : metric
        ));
      })
      .catch(() => {});
    // TODO: Fetch total users if needed
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <NavigationMenu
        items={['Dashboard', 'Guides', 'Travelogues', 'Reviews']}
        onSelect={setTab}
        selected={tab}
      />
      {tab === 'Dashboard' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {metrics.map((m) => (
            <MetricsCard key={m.title} {...m} />
          ))}
        </motion.div>
      )}
      {tab === 'Guides' && (
        <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Guide List</h2>
          <ul>
            {guides.map((g) => (
              <li key={g._id} className="flex justify-between border-b py-2">
                <span>{g.userId?.name || 'Guide'}</span>
                <span className="font-semibold text-green-600">{g.approved ? 'Active' : 'Pending'}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
      {tab === 'Travelogues' && (
        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Travelogue List</h2>
          <ul>
            {travelogues.map((t) => (
              <li key={t._id} className="flex justify-between border-b py-2">
                <span>{t.title}</span>
                <span>{t.guideId?.name || 'Guide'}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
      {tab === 'Reviews' && (
        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <ReviewModeration />
        </motion.div>
      )}
    </div>
  );
}
