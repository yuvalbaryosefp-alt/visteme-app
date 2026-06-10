import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL = 'https://visteme-api-production.up.railway.app';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Inyectar JWT en cada request automáticamente
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authAPI = {
  register: (email: string, password: string) =>
    api.post('/v1/auth/register', { email, password }),

  login: (email: string, password: string) =>
    api.post('/v1/auth/login', { email, password }),

  me: () => api.get('/v1/auth/me'),  // No usado actualmente — user se guarda en AsyncStorage
};

// ── Onboarding ────────────────────────────────────────────────────────────────

export const onboardingAPI = {
  saveVibeCheck: (tags: string[]) =>
    api.post('/v1/onboarding/vibe-check', tags.map(t => ({ style_tag: t, liked: true }))),

  saveBodyProfile: (data: object) =>
    api.post('/v1/onboarding/body-profile', data),
};

// ── Catálogo ──────────────────────────────────────────────────────────────────

export const catalogAPI = {
  fromText: (text: string) =>
    api.post('/v1/catalog/text', { text }),

  fromVoice: (audioUri: string, mimeType = 'audio/m4a') => {
    const form = new FormData();
    form.append('audio', { uri: audioUri, name: 'audio.m4a', type: mimeType } as any);
    return api.post('/v1/catalog/voice', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
  },
};

// ── Clóset ────────────────────────────────────────────────────────────────────

export const closetAPI = {
  list: (params?: { category?: string; available_only?: boolean; skip?: number; limit?: number }) =>
    api.get('/v1/garments', { params }),

  get: (id: string) => api.get(`/v1/garments/${id}`),

  update: (id: string, data: object) => api.patch(`/v1/garments/${id}`, data),

  delete: (id: string) => api.delete(`/v1/garments/${id}`),
};

// ── Outfits ───────────────────────────────────────────────────────────────────

export const outfitAPI = {
  generate: (data: { event_description: string; city: string }) =>
    api.post('/v1/outfits/generate', data, { timeout: 45000 }),

  history: (params?: { skip?: number; limit?: number }) =>
    api.get('/v1/outfits', { params }),

  get: (id: string) => api.get(`/v1/outfits/${id}`),

  delete: (id: string) => api.delete(`/v1/outfits/${id}`),
};

// ── Shop ──────────────────────────────────────────────────────────────────────

export const shopAPI = {
  recommendations: () => api.get('/v1/shop/recommendations'),

  trackClick: (productId: string) =>
    api.post(`/v1/shop/products/${productId}/click`),
};

// ── Try-On ────────────────────────────────────────────────────────────────────

export const tryOnAPI = {
  create: (modelImageUrl: string, garmentImageUrl: string) =>
    api.post('/v1/try-on', { model_image_url: modelImageUrl, garment_image_url: garmentImageUrl }, {
      timeout: 130000, // IDM-VTON puede tardar hasta 2 min
    }),

  createWithProduct: (modelImageUrl: string, productId: string) =>
    api.post('/v1/try-on', { model_image_url: modelImageUrl, product_id: productId }, {
      timeout: 130000,
    }),

  history: () => api.get('/v1/try-on'),
};

export default api;
