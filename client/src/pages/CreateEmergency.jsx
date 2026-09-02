import React, { useState, useEffect } from 'react';
import { emergencyApi, hospitalApi } from '../api/endpoints';
import { useNotifications } from '../context/NotificationContext';
import { Siren, MapPin, Phone, User, CheckCircle2, ShieldCheck, ArrowRight, X } from 'lucide-react';

const CHENNAI_PRESETS = [
  { name: 'Anna Nagar West Extension, Chennai', lat: 13.0850, lng: 80.2101 },
  { name: 'Panagal Park, T. Nagar, Chennai', lat: 13.0418, lng: 80.2341 },
  { name: 'Chennai Central Station / Park Town', lat: 13.0818, lng: 80.2773 },
  { name: 'Kapaleeshwarar Temple, Mylapore, Chennai', lat: 13.0336, lng: 80.2690 },
  { name: 'Kathipara Junction, Guindy, Chennai', lat: 13.0076, lng: 80.2045 },
  { name: 'LB Road / Shastri Nagar, Adyar, Chennai', lat: 13.0067, lng: 80.2575 },
  { name: 'Mount Poonamallee Road, Manapakkam, Chennai', lat: 13.0232, lng: 80.1784 }
];

export default function CreateEmergency({ setActiveTab }) {
  const { showToast } = useNotifications();
  const [hospitals, setHospitals] = useState([]);

  // Form State
  const [callerName, setCallerName] = useState('Kavitha Selvam');
  const [callerPhone, setCallerPhone] = useState('+91 98401 54321');
  const [emergencyType, setEmergencyType] = useState('CARDIAC');
  const [priority, setPriority] = useState('P1_CRITICAL');
  const [pickupAddress, setPickupAddress] = useState(CHENNAI_PRESETS[1].name);
  const [pickupLatitude, setPickupLatitude] = useState(CHENNAI_PRESETS[1].lat);
  const [pickupLongitude, setPickupLongitude] = useState(CHENNAI_PRESETS[1].lng);
  const [destinationHospitalId, setDestinationHospitalId] = useState('');
  const [description, setDescription] = useState('60-year-old male experiencing acute crushing chest pain radiating to left arm.');

  const [submitting, setSubmitting] = useState(false);
  const [recommendationData, setRecommendationData] = useState(null);
  const [createdCase, setCreatedCase] = useState(null);

  useEffect(() => {
    hospitalApi.getHospitals().then((res) => {
      setHospitals(res.data.data);
      if (res.data.data.length > 0) {
        setDestinationHospitalId(res.data.data[0].id);
      }
    });
  }, []);

  const handlePresetSelect = (e) => {
    const selected = CHENNAI_PRESETS.find((p) => p.name === e.target.value);
    if (selected) {
      setPickupAddress(selected.name);
      setPickupLatitude(selected.lat);
      setPickupLongitude(selected.lng);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        callerName,
        callerPhone,
        emergencyType,
        priority,
        description,
        pickupAddress,
        pickupLatitude,
        pickupLongitude,
        destinationHospitalId
      };

      const res = await emergencyApi.createCase(payload);
      setCreatedCase(res.data.data.emergencyCase);
      setRecommendationData(res.data.data.recommendation);
      showToast(`Emergency ${res.data.data.emergencyCase.caseNumber} registered! Reviewing allocation...`, 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create emergency case', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmAllocation = async (candidate) => {
    try {
      const payload = {
        ambulanceId: candidate.ambulance.id,
        driverEmployeeId: candidate.suggestedCrew.driver?.id,
        medicalEmployeeId: candidate.suggestedCrew.medicalOfficer?.id
      };

      await emergencyApi.assignAmbulance(createdCase.id, payload);
      // Immediately dispatch
      await emergencyApi.dispatchCase(createdCase.id);

      showToast(`Ambulance ${candidate.ambulance.registrationNumber} allocated and dispatched!`, 'success');
      setRecommendationData(null);
      setActiveTab('live-tracking');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to complete dispatch', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-red-100 text-red-600 rounded-xl">
            <Siren className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Emergency Intake & Automatic Allocation</h1>
            <p className="text-xs text-slate-500">
              Rule-based matching: Distance (40%), Type (25%), Crew (20%), Equipment (15%)
            </p>
          </div>
        </div>
      </div>

      {/* Intake Form */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Caller Info */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center space-x-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>1. Caller & Contact Details</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Caller Name *</label>
                <input
                  type="text"
                  required
                  value={callerName}
                  onChange={(e) => setCallerName(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Full name of caller"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Caller Phone Number *</label>
                <input
                  type="text"
                  required
                  value={callerPhone}
                  onChange={(e) => setCallerPhone(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Medical Category & Priority */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center space-x-2">
              <Siren className="w-4 h-4 text-red-600" />
              <span>2. Emergency Triage & Category</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Category *</label>
                <select
                  value={emergencyType}
                  onChange={(e) => setEmergencyType(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="CARDIAC">Cardiac Arrest / Severe Chest Pain</option>
                  <option value="TRAUMA">Major Trauma / Multiple Injury</option>
                  <option value="STROKE">Acute Stroke / CVA (Face/Arm/Speech)</option>
                  <option value="RESPIRATORY">Severe Respiratory Distress / Asthma</option>
                  <option value="MATERNITY">Emergency Obstetrics / Active Labour</option>
                  <option value="ACCIDENT">Road Traffic Accident (RTA)</option>
                  <option value="GENERAL">General Medical Emergency</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Priority Level *</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-red-600"
                >
                  <option value="P1_CRITICAL">P1 - Critical (Immediate ALS Required)</option>
                  <option value="P2_HIGH">P2 - High (Urgent Response)</option>
                  <option value="P3_MEDIUM">P3 - Medium (Semi-Urgent)</option>
                  <option value="P4_LOW">P4 - Low (Non-Urgent Patient Transport)</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Notes / Symptoms</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Observed symptoms, patient consciousness, bystander CPR status..."
              />
            </div>
          </div>

          {/* Section 3: Geolocation & Hospital */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-purple-600" />
              <span>3. Pickup Location & Destination Hospital</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quick Chennai Landmark Preset
                </label>
                <select
                  onChange={handlePresetSelect}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-purple-50/50 text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {CHENNAI_PRESETS.map((p) => (
                    <option key={p.name} value={p.name}>
                      📍 {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pickup Address *</label>
                <input
                  type="text"
                  required
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={pickupLatitude}
                    onChange={(e) => setPickupLatitude(parseFloat(e.target.value))}
                    className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={pickupLongitude}
                    onChange={(e) => setPickupLongitude(parseFloat(e.target.value))}
                    className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Hospital *</label>
                <select
                  value={destinationHospitalId}
                  onChange={(e) => setDestinationHospitalId(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      🏥 {h.name} — {h.availableDepartments}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-xl shadow-red-600/30 transition-all disabled:opacity-50"
            >
              <span>{submitting ? 'Registering & Scoring...' : 'Submit Call & Run Allocation Engine'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Allocation Recommendation Modal */}
      {recommendationData && createdCase && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-6 h-6 text-blue-300" />
                  <h3 className="text-lg font-bold">Rule-Based Allocation Recommendations</h3>
                </div>
                <p className="text-xs text-blue-200 mt-0.5">
                  Case {createdCase.caseNumber} • Evaluated {recommendationData.candidates.length} candidate fleet vehicles
                </p>
              </div>
              <button
                onClick={() => setRecommendationData(null)}
                className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="text-xs text-slate-500 bg-blue-50 p-3 rounded-xl border border-blue-200">
                <strong>Allocation Formula:</strong> Total Score = (Distance × 40%) + (Type Suitability × 25%) + (Crew Readiness × 20%) + (Essential Equipment × 15%). Vehicles with MAINTENANCE or OFFLINE status are excluded.
              </div>

              {recommendationData.candidates.map((cand, idx) => {
                const isTop = idx === 0;
                return (
                  <div
                    key={cand.ambulance.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isTop
                        ? 'border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-base text-slate-900">
                            🚑 {cand.ambulance.registrationNumber}
                          </span>
                          <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-slate-100 text-slate-700 border">
                            {cand.ambulance.ambulanceType}
                          </span>
                          {isTop && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-600 text-white">
                              ★ Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          📍 {cand.distanceKm} km away • Est. Arrival: ~{cand.estimatedMinutes} mins • Fuel: {cand.ambulance.fuelLevel}%
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-black text-slate-900">{cand.scores.totalScore} / 100</div>
                        <div className="text-[10px] text-slate-400 font-semibold uppercase">Suitability Score</div>
                      </div>
                    </div>

                    {/* Breakdown Scores */}
                    <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-100 text-center text-xs">
                      <div className="p-2 rounded-lg bg-slate-50">
                        <div className="text-[10px] text-slate-500">Distance (40%)</div>
                        <div className="font-bold text-slate-900">{cand.scores.distanceScore} pts</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50">
                        <div className="text-[10px] text-slate-500">Type (25%)</div>
                        <div className="font-bold text-slate-900">{cand.scores.typeScore} pts</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50">
                        <div className="text-[10px] text-slate-500">Crew (20%)</div>
                        <div className="font-bold text-slate-900">{cand.scores.crewScore} pts</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50">
                        <div className="text-[10px] text-slate-500">Equip (15%)</div>
                        <div className="font-bold text-slate-900">{cand.scores.equipmentScore} pts</div>
                      </div>
                    </div>

                    {/* Matched Crew */}
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl">
                      <div>
                        <strong>Crew Matching:</strong> Driver: {cand.suggestedCrew.driver ? cand.suggestedCrew.driver.name : 'Unassigned'} | Medical: {cand.suggestedCrew.medicalOfficer ? cand.suggestedCrew.medicalOfficer.name : 'Unassigned'}
                      </div>
                      <button
                        onClick={() => handleConfirmAllocation(cand)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow transition-all ${
                          isTop
                            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        Confirm & Dispatch
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
