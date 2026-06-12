import api from '../api';

export const requestVirtualGuideAnswer = async (payload) => {
  try {
    const res = await api.post('/virtual-guide/ask', payload);
    if (!res) return null;
    if (typeof res.data === 'string') {
      return { answer: res.data };
    }
    if (res.data?.answer) {
      return res.data;
    }
    if (res.data?.message) {
      return { answer: res.data.message, mode: res.data.mode };
    }
    return null;
  } catch (err) {
    return null;
  }
};
