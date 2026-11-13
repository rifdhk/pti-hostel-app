import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import Button from '../components/common/Button';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 mb-4 shadow-sm">
        <span className="text-xl font-bold font-mono">404</span>
      </div>
      <h2 className="text-xl font-bold text-slate-900 tracking-tight">Record or Page Not Found</h2>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        The institutional module or file you requested is not accessible or has been relocated.
      </p>
      <div className="mt-6">
        <Link to="/">
          <Button variant="primary" size="md" icon={Home}>
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
