import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { tryOnAPI } from '../services/api';
import { Colors } from '../constants/colors';

/** Comprime un blob URI a JPEG 512×768 máx, ~80-120 KB — sólo web */
const compressImage = (blobUri: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const MAX_W = 512;
      const MAX_H = 768;
      let w = img.width;
      let h = img.height;
      const ratio = Math.min(MAX_W / w, MAX_H / h, 1);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.55));
    };
    img.onerror = reject;
    img.src = blobUri;
  });

export default function TryOnScreen() {
  const [modelPreviewUri, setModelPreviewUri] = useState<string | null>(null);
  const [modelDataUri, setModelDataUri] = useState<string | null>(null);
  const [garmentUrl, setGarmentUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const pickImage = async () => {
    setError('');
    const { status: permStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permStatus !== 'granted') {
      setError('Necesitamos permiso para acceder a tus fotos');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setModelPreviewUri(uri);   // preview local (blob URL)
      setResultUrl(null);
      setError('');
      try {
        setStatus('Comprimiendo imagen...');
        const compressed = await compressImage(uri);  // data URI pequeño (~100 KB)
        setModelDataUri(compressed);
        setStatus('');
      } catch {
        setStatus('');
        setError('No se pudo procesar la imagen. Intenta con otra foto.');
      }
    }
  };

  const generateTryOn = async () => {
    setError('');
    if (!modelDataUri) {
      setError('Selecciona una foto tuya primero');
      return;
    }
    if (!garmentUrl.trim()) {
      setError('Pega la URL de la imagen de la prenda');
      return;
    }

    setLoading(true);
    setResultUrl(null);
    const sizeKB = Math.round((modelDataUri?.length ?? 0) * 0.75 / 1024);
    setStatus(`Enviando imagen (${sizeKB} KB)...`);

    try {
      // 1. POST — inicia el job, regresa en ~2 segundos
      const { data } = await tryOnAPI.create(modelDataUri, garmentUrl.trim());

      if (data.status === 'completed' && data.result_image_url) {
        setResultUrl(data.result_image_url);
        setStatus('');
        setLoading(false);
        return;
      }

      if (data.status === 'failed') {
        setError(data.message || 'El try-on falló.');
        setStatus('');
        setLoading(false);
        return;
      }

      // 2. Polling — pregunta cada 5 segundos hasta 3 minutos
      const tryOnId = data.id;
      let elapsed = 0;
      const MAX_WAIT = 180; // segundos

      while (elapsed < MAX_WAIT) {
        await new Promise(r => setTimeout(r, 5000));
        elapsed += 5;
        setStatus(`Procesando en Replicate... ${elapsed}s ⏳`);

        try {
          const { data: poll } = await tryOnAPI.get(tryOnId);
          if (poll.status === 'completed' && poll.result_image_url) {
            setResultUrl(poll.result_image_url);
            setStatus('');
            setLoading(false);
            return;
          }
          if (poll.status === 'failed') {
            setError('El try-on falló. Intenta con otra foto o prenda.');
            setStatus('');
            setLoading(false);
            return;
          }
        } catch {
          // red inestable — seguimos intentando
        }
      }

      setError('El try-on tardó demasiado. Intenta de nuevo.');
      setStatus('');
    } catch (e: any) {
      setStatus('');
      const httpStatus = e?.response?.status;
      const detail = e?.response?.data?.detail;
      const message = e?.message;
      console.error('TryOn error:', httpStatus, detail, message);
      if (detail?.includes('no está configurado')) {
        setError('Falta configurar REPLICATE_API_KEY en Railway.');
      } else if (httpStatus === 413) {
        setError('Imagen demasiado grande. Intenta con otra foto.');
      } else if (!e?.response) {
        setError(`Error de red: ${message || 'sin respuesta'}. Verifica que el backend esté activo.`);
      } else {
        setError(`Error ${httpStatus || '?'}: ${detail || message || 'desconocido'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Virtual Try-On</Text>
          <Text style={styles.subtitle}>Pruébate cualquier prenda antes de comprarla</Text>
        </View>

        {/* Paso 1: foto del usuario */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Tu foto</Text>
          <Text style={styles.sectionHint}>
            Foto de cuerpo completo · fondo liso funciona mejor
          </Text>
          <TouchableOpacity style={styles.photoArea} onPress={pickImage}>
            {modelPreviewUri ? (
              <Image source={{ uri: modelPreviewUri }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoIcon}>📸</Text>
                <Text style={styles.photoLabel}>Toca para seleccionar foto</Text>
              </View>
            )}
          </TouchableOpacity>
          {modelPreviewUri && (
            <TouchableOpacity onPress={pickImage}>
              <Text style={styles.changePhoto}>Cambiar foto</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Paso 2: URL de la prenda */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. URL de la prenda</Text>
          <Text style={styles.sectionHint}>
            Clic derecho en la imagen → "Copiar dirección de imagen" · fondo blanco funciona mejor
          </Text>
          <TextInput
            style={styles.input}
            placeholder="https://example.com/prenda.jpg"
            placeholderTextColor={Colors.textMuted}
            value={garmentUrl}
            onChangeText={t => { setGarmentUrl(t); setError(''); }}
            autoCapitalize="none"
            keyboardType="url"
          />
          {garmentUrl.trim().length > 10 && (
            <Image
              source={{ uri: garmentUrl.trim() }}
              style={styles.garmentPreview}
              resizeMode="contain"
            />
          )}
        </View>

        {error !== '' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Botón */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={generateTryOn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.background} />
          ) : (
            <Text style={styles.buttonText}>🪞 Probarme esta prenda</Text>
          )}
        </TouchableOpacity>

        {status !== '' && (
          <Text style={styles.statusText}>{status}</Text>
        )}

        {/* Resultado */}
        {resultUrl && (
          <View style={styles.resultSection}>
            <Text style={styles.resultTitle}>✨ Tu resultado</Text>
            <Image
              source={{ uri: resultUrl }}
              style={styles.resultImage}
              resizeMode="contain"
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 48, gap: 20 },
  header: { marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  sectionHint: { fontSize: 12, color: Colors.textMuted },
  photoArea: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    minHeight: 200,
  },
  photoPlaceholder: {
    minHeight: 200,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  photoIcon: { fontSize: 40 },
  photoLabel: { color: Colors.textSecondary, fontSize: 14 },
  photoPreview: { width: '100%', height: 280 },
  changePhoto: {
    color: Colors.accent,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 2,
  },
  input: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  garmentPreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: Colors.card,
  },
  errorBox: {
    backgroundColor: Colors.error + '20',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.error + '60',
  },
  errorText: { color: Colors.error, fontSize: 14 },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Colors.background, fontSize: 16, fontWeight: '700' },
  statusText: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: -8,
  },
  resultSection: { gap: 12, marginTop: 8 },
  resultTitle: { fontSize: 18, fontWeight: '700', color: Colors.accent },
  resultImage: {
    width: '100%',
    height: 400,
    borderRadius: 16,
    backgroundColor: Colors.card,
  },
});
