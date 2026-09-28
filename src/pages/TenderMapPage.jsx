import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Card from '../components/ui/Card.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { formatINR } from '../utils/format.js';
import * as api from '../services/api.js';
import * as riskService from '../services/riskService.js';
import * as tenderService from '../services/tenderService.js';
import {
  MapPin,
  Search,
  Filter,
  RefreshCw,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  ChevronRight,
  ShieldAlert,
  Flame,
  Info,
  AlertCircle,
  ExternalLink,
  Map as MapIcon,
  SlidersHorizontal,
  X
} from 'lucide-react';

// Known city coordinates in India (City-level location precision)
const CITY_COORDINATES = {
  'bengaluru': { lat: 12.9716, lng: 77.5946, label: 'City-level location' },
  'bangalore': { lat: 12.9716, lng: 77.5946, label: 'City-level location' },
  'mysuru': { lat: 12.2958, lng: 76.6394, label: 'City-level location' },
  'mysore': { lat: 12.2958, lng: 76.6394, label: 'City-level location' },
  'hubballi': { lat: 15.3647, lng: 75.1240, label: 'City-level location' },
  'hubli': { lat: 15.3647, lng: 75.1240, label: 'City-level location' },
  'mangaluru': { lat: 12.9141, lng: 74.8560, label: 'City-level location' },
  'belagavi': { lat: 15.8497, lng: 74.4977, label: 'City-level location' },
  'delhi': { lat: 28.6139, lng: 77.2090, label: 'City-level location' },
  'mumbai': { lat: 19.0760, lng: 72.8777, label: 'City-level location' }
};

function getTenderCoordinates(tender, index) {
  if (!tender || !tender.location) return null;
  const locLower = tender.location.toLowerCase();
  if (locLower.includes('not listed') || locLower.includes('unknown') || locLower.includes('unspecified')) {
    return null; // T002 has "Location not listed" - do not invent location
  }

  const matchedCityKey = Object.keys(CITY_COORDINATES).find((city) =>
    locLower.includes(city)
  );

  if (!matchedCityKey) return null;

  const base = CITY_COORDINATES[matchedCityKey];
  // Apply a small deterministic offset if multiple tenders share a city
  const offsetLat = (index % 3 - 1) * 0.018;
  const offsetLng = (Math.floor(index / 3) % 3 - 1) * 0.018;

  return {
    lat: base.lat + offsetLat,
    lng: base.lng + offsetLng,
    cityName: tender.location,
    precisionLabel: base.label
  };
}

function getRiskCategory(score, level, status) {
  if (status === 'FROZEN' || level === 'HIGH' || (score !== null && score !== undefined && score >= 70)) {
    return 'HIGH';
  }
  if (level === 'MEDIUM' || (score !== null && score !== undefined && score >= 40 && score <= 69)) {
    return 'MEDIUM';
  }
  if (level === 'LOW' || (score !== null && score !== undefined && score <= 39)) {
    return 'LOW';
  }
  return 'PENDING';
}

function createCustomMarkerIcon(riskCat, tenderId, isSelected, isRiskMode) {
  let color = '#64748B';
  let glowColor = 'rgba(100, 116, 139, 0.3)';

  if (riskCat === 'HIGH') {
    color = '#EF4444';
    glowColor = 'rgba(239, 68, 68, 0.5)';
  } else if (riskCat === 'MEDIUM') {
    color = '#F59E0B';
    glowColor = 'rgba(245, 158, 11, 0.4)';
  } else if (riskCat === 'LOW') {
    color = '#10B981';
    glowColor = 'rgba(16, 185, 129, 0.35)';
  }

  const pulseEffect = (riskCat === 'HIGH' || isRiskMode) ? 'animate-ping opacity-75' : '';
  const selectedStyle = isSelected ? 'border-4 border-white shadow-2xl scale-125' : 'border-2 border-[#0B1220]';

  const html = `
    <div class="relative flex items-center justify-center cursor-pointer transition-transform duration-200">
      <div class="absolute w-8 h-8 rounded-full ${pulseEffect}" style="background-color: ${glowColor};"></div>
      <div class="relative z-10 flex items-center justify-center w-8 h-8 rounded-full shadow-xl ${selectedStyle}" style="background-color: ${color}; font-family: monospace;">
        <span class="text-[10px] font-bold text-white">${tenderId}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'custom-tender-marker-wrapper',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
}

export function TenderMapPage() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const heatGroupRef = useRef(null);

  const [tenders, setTenders] = useState([]);
  const [riskReports, setRiskReports] = useState({});
  const [decisionReports, setDecisionReports] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('ALL'); // ALL, OPEN, UNDER_REVIEW, AWARDED, HIGH_RISK
  const [viewMode, setViewMode] = useState('MARKERS'); // MARKERS, RISK_VIEW
  const [selectedTender, setSelectedTender] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const tendersData = await api.getTenders().catch(() => []);
      const currentTenders = tendersData || [];
      setTenders(currentTenders);

      const riskMap = {};
      const decisionMap = {};

      await Promise.all(
        currentTenders.map(async (t) => {
          const [risk, decision] = await Promise.all([
            riskService.getRiskReport(t.id).catch(() => null),
            tenderService.getDecisionReport(t.id).catch(() => null)
          ]);
          if (risk) riskMap[t.id] = risk;
          if (decision) decisionMap[t.id] = decision;
        })
      );

      setRiskReports(riskMap);
      setDecisionReports(decisionMap);
    } catch (err) {
      console.error('Error loading map tender data:', err);
      setError(err.message || 'Failed to connect to procurement intelligence map service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter tenders based on search and selected filter chip
  const filteredTenders = tenders.filter((tender) => {
    const matchesSearch =
      !searchTerm ||
      tender.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tender.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tender.location && tender.location.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    const risk = riskReports[tender.id];
    const score = tender.riskScore ?? risk?.riskScore;
    const level = tender.riskLevel ?? risk?.riskLevel;
    const riskCat = getRiskCategory(score, level, tender.status);

    if (filterMode === 'OPEN') {
      return ['OPEN', 'SEALED', 'REVEAL', 'DRAFT'].includes(tender.status);
    }
    if (filterMode === 'UNDER_REVIEW') {
      return tender.status === 'FROZEN' || tender.status === 'ANALYZING' || riskCat === 'HIGH';
    }
    if (filterMode === 'AWARDED') {
      return tender.status === 'AWARDED';
    }
    if (filterMode === 'HIGH_RISK') {
      return riskCat === 'HIGH';
    }
    return true;
  });

  // Initialize Leaflet Map
  useEffect(() => {
    if (loading || !mapRef.current || mapInstanceRef.current) return;

    // Initial view centered on India: latitude 20.5937, longitude 78.9629, zoom 5
    const map = L.map(mapRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
      attributionControl: true
    });

    // Standard OpenStreetMap tile layer (No API key required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    markersGroupRef.current = L.layerGroup().addTo(map);
    heatGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Recalculate map size after layout renders
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loading]);

  // Update map markers when filteredTenders, viewMode, or selectedTender changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersGroupRef.current || !heatGroupRef.current) return;

    markersGroupRef.current.clearLayers();
    heatGroupRef.current.clearLayers();

    filteredTenders.forEach((tender, index) => {
      const coords = getTenderCoordinates(tender, index);
      if (!coords) return; // Skip tenders without known coordinates (e.g. T002)

      const risk = riskReports[tender.id];
      const score = tender.riskScore ?? risk?.riskScore;
      const level = tender.riskLevel ?? risk?.riskLevel;
      const riskCat = getRiskCategory(score, level, tender.status);
      const isSelected = selectedTender?.id === tender.id;

      // Add Marker
      const icon = createCustomMarkerIcon(riskCat, tender.id, isSelected, viewMode === 'RISK_VIEW');
      const marker = L.marker([coords.lat, coords.lng], { icon });

      // Popup Content
      const popupHtml = `
        <div style="font-family: sans-serif; color: #0F172A; padding: 6px; min-width: 170px;">
          <div style="font-weight: bold; font-size: 13px; color: #EA580C;">${tender.id}</div>
          <div style="font-weight: 600; font-size: 12px; margin-top: 2px;">${tender.title}</div>
          <div style="font-size: 11px; color: #64748B; margin-top: 4px;">City-level location: ${coords.cityName}</div>
          <div style="font-size: 11px; margin-top: 4px; font-weight: bold; color: ${riskCat === 'HIGH' ? '#DC2626' : riskCat === 'MEDIUM' ? '#D97706' : '#059669'};">
            Risk: ${riskCat} ${score !== null && score !== undefined ? `(${score})` : ''}
          </div>
          <div style="font-size: 11px; color: #334155; margin-top: 4px;">Budget: ${formatINR(tender.budget)}</div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        setSelectedTender(tender);
      });

      markersGroupRef.current.addLayer(marker);

      // Risk View overlay circles
      if (viewMode === 'RISK_VIEW') {
        let circleColor = '#10B981';
        let radius = 20000;
        if (riskCat === 'HIGH') {
          circleColor = '#EF4444';
          radius = 45000;
        } else if (riskCat === 'MEDIUM') {
          circleColor = '#F59E0B';
          radius = 30000;
        }

        const circle = L.circle([coords.lat, coords.lng], {
          color: circleColor,
          fillColor: circleColor,
          fillOpacity: riskCat === 'HIGH' ? 0.35 : 0.2,
          radius: radius,
          weight: 2
        });

        heatGroupRef.current.addLayer(circle);
      }
    });

    map.invalidateSize();
  }, [filteredTenders, viewMode, selectedTender, riskReports]);

  // Handle selecting a tender from list or map
  const handleSelectTender = (tender) => {
    setSelectedTender(tender);
    const coords = getTenderCoordinates(tender, tenders.findIndex((t) => t.id === tender.id));

    if (coords && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([coords.lat, coords.lng], 9, {
        duration: 1.2
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Procurement Intelligence Map"
          subtitle="Explore tender locations, procurement risk, bidder participation and execution status."
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[550px] bg-[#111A2E] rounded-xl border border-[#1E2A44] animate-pulse flex items-center justify-center">
            <span className="text-sm text-slate-500">Loading Map Intelligence Layer...</span>
          </div>
          <div className="h-[550px] bg-[#111A2E] rounded-xl border border-[#1E2A44] animate-pulse p-4 space-y-4">
            <div className="h-10 bg-[#1E2A44] rounded-lg"></div>
            <div className="h-32 bg-[#1E2A44] rounded-lg"></div>
            <div className="h-32 bg-[#1E2A44] rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Procurement Intelligence Map"
          subtitle="Explore tender locations, procurement risk, bidder participation and execution status."
        />
        <Card className="border-rose-800/60 bg-rose-950/20 text-rose-200">
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
            <h3 className="text-lg font-semibold text-white">Map Data Connection Failed</h3>
            <p className="mt-1 text-sm text-slate-300 max-w-md">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white font-medium text-sm hover:bg-rose-500 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Reconnect Map Service
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const selectedRisk = selectedTender ? riskReports[selectedTender.id] : null;
  const selectedDecision = selectedTender ? decisionReports[selectedTender.id] : null;
  const selectedScore = selectedTender?.riskScore ?? selectedRisk?.riskScore;
  const selectedLevel = selectedTender?.riskLevel ?? selectedRisk?.riskLevel;
  const selectedRiskCat = selectedTender ? getRiskCategory(selectedScore, selectedLevel, selectedTender.status) : null;
  const selectedCoords = selectedTender ? getTenderCoordinates(selectedTender, tenders.findIndex(t => t.id === selectedTender.id)) : null;

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <PageHeader
        title="Procurement Intelligence Map"
        subtitle="Explore tender locations, procurement risk, bidder participation and execution status."
        badge={
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-950/70 text-blue-400 border border-blue-700/50">
            <MapIcon className="w-3.5 h-3.5" />
            Geographic Oversight
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1E2A44] bg-[#0B1220] hover:bg-[#15213B] text-slate-300 text-sm font-medium transition-colors"
              title="Refresh spatial data"
            >
              <RefreshCw className="w-4 h-4 text-[#FF6B4A]" />
              Refresh Map
            </button>
          </div>
        }
      />

      {/* Filter Bar & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-[#1E2A44] bg-[#111A2E]">
        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold uppercase text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#FF6B4A]" /> Filter:
          </span>
          {[
            { id: 'ALL', label: 'All Tenders' },
            { id: 'OPEN', label: 'Open' },
            { id: 'UNDER_REVIEW', label: 'Under Review / Frozen' },
            { id: 'AWARDED', label: 'Awarded' },
            { id: 'HIGH_RISK', label: 'High Risk' }
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setFilterMode(chip.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterMode === chip.id
                  ? 'bg-[#FF6B4A] text-white shadow-md'
                  : 'bg-[#0B1220] text-slate-300 border border-[#1E2A44] hover:bg-[#15213B]'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* View Mode Toggle: [Markers] [Risk View] */}
        <div className="flex items-center gap-3">
          <div className="inline-flex p-1 rounded-lg bg-[#0B1220] border border-[#1E2A44]">
            <button
              onClick={() => setViewMode('MARKERS')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'MARKERS'
                  ? 'bg-[#15213B] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Markers
            </button>
            <button
              onClick={() => setViewMode('RISK_VIEW')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === 'RISK_VIEW'
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              Risk View
            </button>
          </div>

          {/* Search Field */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID, title, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#1E2A44] bg-[#0B1220] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FF6B4A] w-48 sm:w-60"
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Map Container (2/3) & Tender List / Detail Panel (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Column */}
        <div className="lg:col-span-2 relative flex flex-col">
          <div className="relative rounded-xl border border-[#1E2A44] overflow-hidden bg-[#0B1220] h-[550px] shadow-2xl z-0">
            {/* Map DOM Element */}
            <div ref={mapRef} className="w-full h-full z-0 min-h-[550px]" style={{ minHeight: '550px' }}></div>

            {/* Map Legend Overlay */}
            <div className="absolute bottom-4 left-4 z-[400] bg-[#0B1220]/95 backdrop-blur border border-[#1E2A44] p-3 rounded-lg shadow-xl text-xs space-y-1.5 pointer-events-auto">
              <div className="font-semibold text-white uppercase text-[10px] tracking-wider mb-1">
                Risk Classification Legend
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></span>
                <span>Low Risk (&le; 39)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm"></span>
                <span>Medium Risk (40 - 69)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm animate-pulse"></span>
                <span>High Risk / Frozen (&ge; 70)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-3 h-3 rounded-full bg-slate-500 shadow-sm"></span>
                <span>Pending / Unscored</span>
              </div>
            </div>

            {/* Precision Disclaimer Overlay */}
            <div className="absolute top-4 right-4 z-[400] bg-[#0B1220]/95 backdrop-blur border border-[#1E2A44] px-3 py-1.5 rounded-lg shadow-xl text-[11px] text-slate-400 flex items-center gap-1.5 pointer-events-auto">
              <Info className="w-3.5 h-3.5 text-blue-400" />
              <span>City-level location mapping</span>
            </div>
          </div>
        </div>

        {/* Sidebar / Details Column */}
        <div className="space-y-4 flex flex-col justify-between">
          {/* Selected Tender Panel (if any selected) */}
          {selectedTender ? (
            <Card
              header={
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#FF8A72]">{selectedTender.id}</span>
                    <StatusBadge status={selectedTender.status} size="xs" />
                  </div>
                  <button
                    onClick={() => setSelectedTender(null)}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1E2A44]"
                    title="Close Details"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              }
            >
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white">{selectedTender.title}</h3>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-[#FF6B4A]" />
                    <span>
                      {selectedCoords ? `City-level location: ${selectedCoords.cityName}` : 'Location not listed'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-[#0B1220] p-3 rounded-xl border border-[#1E2A44]">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">Risk Score & Level</span>
                    <div className="mt-1">
                      {selectedRiskCat === 'HIGH' && (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" /> HIGH {selectedScore !== null ? `(${selectedScore})` : ''}
                        </span>
                      )}
                      {selectedRiskCat === 'MEDIUM' && (
                        <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                          <Clock className="w-3.5 h-3.5" /> MEDIUM {selectedScore !== null ? `(${selectedScore})` : ''}
                        </span>
                      )}
                      {selectedRiskCat === 'LOW' && (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> LOW {selectedScore !== null ? `(${selectedScore})` : ''}
                        </span>
                      )}
                      {selectedRiskCat === 'PENDING' && (
                        <span className="text-slate-400 font-medium">PENDING EVALUATION</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">Tender Value</span>
                    <span className="mt-1 font-bold text-white block truncate">{formatINR(selectedTender.budget)}</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">Bidders</span>
                    <span className="mt-1 font-semibold text-slate-200 block">{selectedTender.bidCount || 0} Sealed Bids</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">Winner / Lead</span>
                    <span className="mt-1 font-medium text-slate-300 block truncate">
                      {selectedDecision?.winner?.supplierName ||
                        selectedTender.contractAwardee ||
                        (selectedTender.winnerSupplierId ? `Supplier ${selectedTender.winnerSupplierId}` : '—')}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-[#1E2A44]">
                  <span className="text-xs text-slate-400">{selectedTender.department}</span>
                  <Link
                    to={`/admin/tenders/${selectedTender.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FF6B4A] hover:bg-[#FF8A72] text-white text-xs font-semibold transition-colors"
                  >
                    View Tender <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </Card>
          ) : null}

          {/* Tender List Container */}
          <Card
            className="flex-1 overflow-hidden"
            header={
              <div className="flex items-center justify-between w-full">
                <h2 className="text-sm font-semibold text-white">Monitored Tenders</h2>
                <span className="text-xs text-slate-400 font-mono">
                  {filteredTenders.length} showing
                </span>
              </div>
            }
          >
            {filteredTenders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No tenders matching selected filter or search criteria.
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {filteredTenders.map((tender, idx) => {
                  const risk = riskReports[tender.id];
                  const score = tender.riskScore ?? risk?.riskScore;
                  const level = tender.riskLevel ?? risk?.riskLevel;
                  const riskCat = getRiskCategory(score, level, tender.status);
                  const isSelected = selectedTender?.id === tender.id;

                  return (
                    <div
                      key={tender.id}
                      onClick={() => handleSelectTender(tender)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#FF6B4A] bg-[#15213B]'
                          : 'border-[#1E2A44] bg-[#0B1220] hover:border-[#1E2A44]/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#FF8A72]">{tender.id}</span>
                          <StatusBadge status={tender.status} size="xs" />
                        </div>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {tender.location || 'Location not listed'}
                        </span>
                      </div>

                      <div className="mt-1 text-xs font-semibold text-white line-clamp-1">{tender.title}</div>

                      <div className="mt-2.5 pt-2 border-t border-[#1E2A44]/60 flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-300">{formatINR(tender.budget)}</span>
                        <span
                          className={`font-bold ${
                            riskCat === 'HIGH'
                              ? 'text-rose-400'
                              : riskCat === 'MEDIUM'
                              ? 'text-amber-400'
                              : riskCat === 'LOW'
                              ? 'text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          Risk: {riskCat}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default TenderMapPage;
