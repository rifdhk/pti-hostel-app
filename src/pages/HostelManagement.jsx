import React, { useState, useEffect } from 'react';
import { Building2, Plus, Filter, Bed, Search, CheckCircle, AlertTriangle } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { useAuth } from '../contexts/AuthContext';
import { dbService, COLLECTIONS, isBaasConfigured, upsertRecordToCloud } from '../services/db';

export default function HostelManagement() {
  const { isSuperintendent, effectiveHostelId, effectivePtiId, userProfile } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selectedWing, setSelectedWing] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoom, setNewRoom] = useState({
    roomNumber: '',
    wing: 'Block A',
    floor: 1,
    capacity: 3,
  });

  useEffect(() => {
    loadRooms();
    window.addEventListener('pti_rooms_changed', loadRooms);
    window.addEventListener('pti_hostels_changed', loadRooms);
    return () => {
      window.removeEventListener('pti_rooms_changed', loadRooms);
      window.removeEventListener('pti_hostels_changed', loadRooms);
    };
  }, [effectiveHostelId]);

  const loadRooms = () => {
    const all = dbService.getRooms();
    // Strict isolation: if not superintendent, lock to effectiveHostelId
    if (!isSuperintendent) {
      setRooms(all.filter(r => r.hostelId === effectiveHostelId));
    } else {
      setRooms(effectiveHostelId ? all.filter(r => r.hostelId === effectiveHostelId) : all);
    }
  };

  const saveRooms = (updatedForHostel) => {
    setRooms(updatedForHostel);
    const all = dbService.getRooms();
    const remaining = all.filter(r => r.hostelId !== effectiveHostelId);
    const merged = [...remaining, ...updatedForHostel];
    dbService.saveRooms(merged);
  };

  const handleAddRoom = (e) => {
    e.preventDefault();
    const created = {
      id: `R${newRoom.roomNumber}_${Date.now()}`,
      pti_id: effectivePtiId || userProfile?.pti_id || 'pti_dhaka',
      hostelId: effectiveHostelId || 'hostel_01',
      roomNumber: newRoom.roomNumber,
      wing: newRoom.wing,
      floor: Number(newRoom.floor),
      capacity: Number(newRoom.capacity),
      occupied: 0,
      status: 'Available',
      residents: []
    };

    const all = dbService.getRooms();
    const updatedAll = [...all, created];
    dbService.saveRooms(updatedAll);
    if (isBaasConfigured) {
      Promise.resolve()
        .then(() => upsertRecordToCloud(COLLECTIONS.ROOMS, created.id, created))
        .catch(() => {});
    }
    loadRooms();
    setShowAddModal(false);
    setNewRoom({ roomNumber: '', wing: 'Block A', floor: 1, capacity: 3 });
  };

  const filteredRooms = selectedWing === 'all' 
    ? rooms 
    : rooms.filter(r => r.wing.toLowerCase().includes(selectedWing.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quarters & Room Allotment</h1>
            {!isSuperintendent && (
              <Badge variant="teal" size="sm">Strict Isolation: {userProfile?.hostelName || 'My Hall'}</Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Manage residential blocks, room allocations, and bed capacities.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md">
            Export Roster
          </Button>
          {(isSuperintendent || userProfile?.role === 'hostel_super') && (
            <Button variant="primary" size="md" icon={Plus} onClick={() => setShowAddModal(true)}>
              Add New Room
            </Button>
          )}
        </div>
      </div>

      {/* Filter and stats row */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter Wing:</span>
          {['all', 'Block A', 'Block B', 'East Block'].map((wing) => (
            <button
              key={wing}
              onClick={() => setSelectedWing(wing)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                selectedWing === wing
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {wing === 'all' ? 'All Blocks' : wing}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-800">{filteredRooms.length}</span> rooms in active hall
        </div>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredRooms.map((room) => {
          const isFull = room.occupied >= room.capacity;
          return (
            <div 
              key={room.id}
              className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                    <Bed className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Room {room.roomNumber}</h3>
                    <p className="text-[11px] text-slate-400">Floor {room.floor}</p>
                  </div>
                </div>
                <Badge variant={isFull ? 'neutral' : 'teal'} size="sm">
                  {isFull ? 'Full' : 'Available'}
                </Badge>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 font-medium">{room.wing}</p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Occupancy:</span>
                  <span className="font-semibold text-slate-700">
                    {room.occupied} / {room.capacity} Beds
                  </span>
                </div>

                {/* Bed indicator pills */}
                <div className="mt-3 flex gap-1.5">
                  {Array.from({ length: room.capacity }).map((_, idx) => (
                    <div
                      key={idx}
                      title={`Bed ${idx + 1}: ${idx < room.occupied ? 'Occupied' : 'Vacant'}`}
                      className={`h-2 flex-1 rounded-full ${
                        idx < room.occupied ? 'bg-brand-600' : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>

                {room.residents && room.residents.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-50">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Current Residents:</p>
                    <p className="text-xs text-slate-700 font-medium truncate mt-0.5">
                      {room.residents.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Room Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-dropdown p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add New Hostel Room</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleAddRoom} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Room Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 104"
                  value={newRoom.roomNumber}
                  onChange={(e) => setNewRoom({ ...newRoom, roomNumber: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Wing / Block</label>
                <select
                  value={newRoom.wing}
                  onChange={(e) => setNewRoom({ ...newRoom, wing: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                >
                  <option>Block A</option>
                  <option>Block B</option>
                  <option>East Block</option>
                  <option>West Block</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Floor</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    required
                    value={newRoom.floor}
                    onChange={(e) => setNewRoom({ ...newRoom, floor: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Bed Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    required
                    value={newRoom.capacity}
                    onChange={(e) => setNewRoom({ ...newRoom, capacity: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" size="sm">Create Room</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
