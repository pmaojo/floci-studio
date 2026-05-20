import React from 'react';
import { motion } from 'motion/react';
import { Frown, ArrowLeft } from 'lucide-react';
import { Button, Card } from '../components/ui-elements';
import { useNavigate } from 'react-router-dom';

const ServiceNotAvailable: React.FC<{ service: string }> = ({ service }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-6">
        <Frown size={48} />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">{service} Coming Soon</h2>
      <p className="text-slate-500 max-w-md mb-8">
        We're working hard to add full management support for {service}. 
        Stay tuned for updates!
      </p>
      <Button variant="secondary" onClick={() => navigate('/')} icon={<ArrowLeft size={18} />}>
        Back to Dashboard
      </Button>
    </motion.div>
  );
};

export default ServiceNotAvailable;
