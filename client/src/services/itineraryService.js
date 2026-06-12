import api from '../api';

export const generateItinerary = async (payload) => {
  const response = await api.post('/itinerary/generate', payload);
  return response.data;
};

export const getItineraryPreferences = async () => {
  const response = await api.get('/itinerary/preferences');
  return response.data;
};

export const getItinerarySocialContent = async ({ destination = '', stopName = '', limit = 6 } = {}) => {
  const response = await api.get('/itinerary/social-content', {
    params: {
      destination,
      stopName,
      limit,
    },
  });
  return response.data;
};

export const listSavedItineraries = async () => {
  const response = await api.get('/itinerary/saved');
  return response.data;
};

export const getSavedItineraryById = async (id) => {
  const response = await api.get(`/itinerary/saved/${id}`);
  return response.data;
};

export const saveGeneratedItinerary = async (payload) => {
  const response = await api.post('/itinerary/saved', payload);
  return response.data;
};

export const updateSavedItinerary = async (id, payload) => {
  const response = await api.put(`/itinerary/saved/${id}`, payload);
  return response.data;
};

export const deleteSavedItinerary = async (id) => {
  const response = await api.delete(`/itinerary/saved/${id}`);
  return response.data;
};

export const downloadItineraryPdf = async ({ itinerary, tripRequest }) => {
  const response = await api.post(
    '/itinerary/pdf',
    { itinerary, tripRequest },
    { responseType: 'blob' }
  );

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `itinerary-${(itinerary?.destination || 'trip').replace(/\s+/g, '-').toLowerCase()}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
