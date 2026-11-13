import React, { useState, useEffect } from 'react';
import { Trophy, Plus, Dumbbell, Shield, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';

const DEFAULT_EQUIPMENT = [
  { id: 'EQ-01', name: 'Standard Footballs (Size 5)', category: 'Athletics', totalQty: 25, availableQty: 18, condition: 'Good', inCharge: 'Capt. R. Sharma' },
  { id: 'EQ-02', name: 'Cricket Batting Kits & Pads', category: 'Cricket', totalQty: 12, availableQty: 8, condition: 'Good', inCharge: 'Coach Dev' },
  { id: 'EQ-03', name: 'Basketballs (Spalding Regulation)', category: 'Athletics', totalQty: 15, availableQty: 14, condition: 'Good', inCharge: 'Capt. R. Sharma' },
  { id: 'EQ-04', name: 'Table Tennis Blades & Nets', category: 'Indoor Sports', totalQty: 20, availableQty: 16, condition: 'Fair', inCharge: 'Subedar M. Khan' },
  { id: 'EQ-05', name: 'Parade Marching Side-Drums', category: 'Parade & Drill', totalQty: 6, availableQty: 6, condition: 'Excellent', inCharge: 'Capt. R. Sharma' },
  { id: 'EQ-06', name: 'Cross-Country Running Stopwatches', category: 'Field Athletics', totalQty: 10, availableQty: 10, condition: 'Excellent', inCharge: 'Capt. R. Sharma' },
];

const DEFAULT_DRILLS = [
  { id: 'D-01', title: 'Morning Conditioning & 5KM Field Run', time: '06:00 AM - 07:15 AM', location: 'Main Athletic Grounds', instructor: 'Capt. R. Sharma', status: 'Completed', targetGroup: 'All Cadets' },
  { id: 'D-02', title: 'Obstacle Course & Calisthenics Drill', time: '04:45 PM - 06:00 PM', location: 'Obstacle Ground #2', instructor: 'Subedar M. Khan', status: 'Scheduled', targetGroup: 'Junior Wings' },
  { id: 'D-03', title: 'Inter-Hostel Football League Practice', time: '06:15 PM - 07:30 PM', location: 'Stadium Pitch', instructor: 'Coach Dev', status: 'Active', targetGroup: 'Hostel Squads' },
];

export default function PTIDepartment() {
  const [equipment, setEquipment] = useState([]);
  const [drills, setDrills] = useState([]);
  const [showDrillModal, setShowDrillModal] = useState(false);
  const [newDrill, setNewDrill] = useState({
    title: '',
    time: '06:00 AM - 07:15 AM',
    location: 'Main Athletic Grounds',
    instructor: 'Capt. R. Sharma (PTI Head)',
    targetGroup: 'All Cadets'
  });

  useEffect(() => {
    const rawEq = localStorage.getItem('pti_db_equipment');
    setEquipment(rawEq ? JSON.parse(rawEq) : DEFAULT_EQUIPMENT);

    const rawDrills = localStorage.getItem('pti_db_drills');
    setDrills(rawDrills ? JSON.parse(rawDrills) : DEFAULT_DRILLS);
  }, []);

  const saveEquipment = (updated) => {
    setEquipment(updated);
    localStorage.setItem('pti_db_equipment', JSON.stringify(updated));
  };

  const saveDrills = (updated) => {
    setDrills(updated);
    localStorage.setItem('pti_db_drills', JSON.stringify(updated));
  };

  const handleCheckout = (id) => {
    const updated = equipment.map(item => {
      if (item.id === id && item.availableQty > 0) {
        return { ...item, availableQty: item.availableQty - 1 };
      }
      return item;
    });
    saveEquipment(updated);
  };

  const handleReturn = (id) => {
    const updated = equipment.map(item => {
      if (item.id === id && item.availableQty < item.totalQty) {
        return { ...item, availableQty: item.availableQty + 1 };
      }
      return item;
    });
    saveEquipment(updated);
  };

  const handleCreateDrill = (e) => {
    e.preventDefault();
    const created = {
      id: `D-0${drills.length + 1}`,
      ...newDrill,
      status: 'Scheduled'
    };
    saveDrills([...drills, created]);
    setShowDrillModal(false);
    setNewDrill({
      title: '',
      time: '06:00 AM - 07:15 AM',
      location: 'Main Athletic Grounds',
      instructor: 'Capt. R. Sharma (PTI Head)',
      targetGroup: 'All Cadets'
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">PTI & Sports Department</h1>
          <p className="text-sm text-slate-500 mt-0.5">Physical training drills, athletic grounds, and sports equipment armory.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" size="md" icon={Plus} onClick={() => setShowDrillModal(true)}>
            Schedule Training Drill
          </Button>
        </div>
      </div>

      {/* Equipment Inventory & Active Drills */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Equipment Table (2 cols) */}
        <div className="lg:col-span-2">
          <Card 
            title="Sports & Athletic Equipment Armory" 
            subtitle="Central armory inventory status and cadet checkout logs"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[550px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3 pl-1">Equipment Name</th>
                    <th className="pb-3 text-center">Available / Total</th>
                    <th className="pb-3 text-center">Condition</th>
                    <th className="pb-3 text-right pr-1">Armory Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {equipment.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 pl-1">
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <span className="text-[11px] text-slate-400">{item.category} • In-Charge: {item.inCharge}</span>
                      </td>
                      <td className="py-3 text-center font-medium font-mono">
                        <span className="text-brand-700 font-bold text-sm">{item.availableQty}</span>
                        <span className="text-slate-400"> / {item.totalQty}</span>
                      </td>
                      <td className="py-3 text-center">
                        <Badge variant={item.condition === 'Excellent' || item.condition === 'Good' ? 'teal' : 'warning'} size="sm">
                          {item.condition}
                        </Badge>
                      </td>
                      <td className="py-3 text-right pr-1 space-x-1.5">
                        <button
                          onClick={() => handleCheckout(item.id)}
                          disabled={item.availableQty <= 0}
                          className="px-2 py-1 rounded bg-brand-50 hover:bg-brand-100 text-brand-700 text-[11px] font-semibold transition-colors disabled:opacity-40"
                        >
                          Issue
                        </button>
                        <button
                          onClick={() => handleReturn(item.id)}
                          disabled={item.availableQty >= item.totalQty}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors disabled:opacity-40"
                        >
                          Return
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Drill Calendar (1 col) */}
        <div className="lg:col-span-1">
          <Card 
            title="Scheduled PT Drills" 
            subtitle="Parade, PT & fitness schedule"
            action={<Badge variant="teal" size="sm">{drills.length} Sessions</Badge>}
          >
            <div className="space-y-3.5">
              {drills.map((drill) => (
                <div key={drill.id} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-brand-700 font-mono">{drill.time}</span>
                    <Badge variant={drill.status === 'Completed' ? 'neutral' : 'teal'} size="sm">{drill.status}</Badge>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">{drill.title}</h4>
                  <p className="text-[11px] text-slate-500">{drill.location}</p>
                  <p className="text-[10px] text-slate-400 font-medium">Instructor: {drill.instructor}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

      </div>

      {/* Schedule Drill Modal */}
      {showDrillModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-dropdown p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Schedule Physical Training Drill</h3>
              <button onClick={() => setShowDrillModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateDrill} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Drill Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5KM Cross-Country & Calisthenics"
                  value={newDrill.title}
                  onChange={(e) => setNewDrill({ ...newDrill, title: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Time Slot</label>
                <input
                  type="text"
                  required
                  value={newDrill.time}
                  onChange={(e) => setNewDrill({ ...newDrill, time: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Ground / Venue</label>
                <input
                  type="text"
                  required
                  value={newDrill.location}
                  onChange={(e) => setNewDrill({ ...newDrill, location: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowDrillModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" size="sm">Schedule Drill</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
