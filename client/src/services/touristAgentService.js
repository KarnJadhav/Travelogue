import api from '../api';

export const sendTouristAgentCommand = async ({ command, pendingAction }) => {
  const response = await api.post('/touristAgent/command', {
    command,
    pendingAction: pendingAction || null,
  });
  return response.data;
};

