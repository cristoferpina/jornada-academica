const getBaseUrl = () => {
  const hostname = window.location.hostname;
  return `http://${hostname}:3000`;
};

const BASE_URL = getBaseUrl();
const API_URL = `${BASE_URL}/api`;

export { BASE_URL, API_URL };
