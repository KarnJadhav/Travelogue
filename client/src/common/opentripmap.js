// OpenTripMap API utility for hospital search
import axios from 'axios';

const OPENTRIPMAP_API_KEY = import.meta.env.VITE_OPENTRIPMAP_API_KEY || '';
const BASE_URL = 'https://api.opentripmap.com/0.1/en/places';

export async function fetchHospitals(lat, lon, radius = 5000) {
  if (!OPENTRIPMAP_API_KEY) return [];
  // Search for hospitals near lat/lon
  const kinds = 'healthcare.hospital';
  const url = `${BASE_URL}/radius?radius=${radius}&lon=${lon}&lat=${lat}&kinds=${kinds}&apikey=${OPENTRIPMAP_API_KEY}`;
  const resp = await axios.get(url);
  return resp.data.features || [];
}

export async function fetchHospitalDetails(xid) {
  if (!OPENTRIPMAP_API_KEY) return null;
  // Fetch details for a hospital by xid
  const url = `${BASE_URL}/xid/${xid}?apikey=${OPENTRIPMAP_API_KEY}`;
  const resp = await axios.get(url);
  return resp.data;
}

// Example: fetchHospitals(48.8566, 2.3522) for Paris
