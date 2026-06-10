import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { outfitAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/colors';

interface GarmentSnippet {
  color_primary: string;
  subcategory: string;
}

interface OutfitResult {
  id: string;
  explanation: string;
  total_score: number;
  top?: GarmentSnippet | null;
  bottom?: GarmentSnippet | null;
  footwear?: GarmentSnippet | null;
  accessory?: GarmentSnippet | null;
}

interface WeatherInfo {
  temp_c: number;
  condition: string;
  description: string;
}

export default function HomeScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [event, setEvent] = useState('');
  const [city, setCity] = useState('Ciudad de México');
  const [loading, setLoading] = useState(false);
  const [outfit, setOutfit] = useState<OutfitResult | null>(null);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);

  const generateOutfit = async () => {
    if (!event.trim()) {
      Alert.alert('Error', '¿Para qué ocasión es el outfit?');
      return;
    }
    setLoading(true);
    setOutfit(null);
    try {
      const { data } = await outfitAPI.generate({ event_description: event, city });
      setOutfit(data.outfit);
      setWeather(data.weather);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (detail === 'No hay suficientes prendas disponibles para generar un outfit') {
        Alert.alert(
          'Clóset vacío',
          'Primero agrega algunas prendas en la pestaña Clóset.',
          [{ text: 'Ir al Clóset', onPress: () => navigation.navigate('Closet') }]
        );
      } else {
        Alert.alert('Error', detail || 'No se pudo generar el outfit');
      }
    } finally {
      setLoading(false);
    }
  };

  const stripMarkdown = (text: string) =>
    text
      .replace(/^#{1,6}\s+/gm, '')       // quitar headings
      .replace(/\*\*(.*?)\*\*/g, '$1')    // quitar bold
      .replace(/\*(.*?)\*/g, '$1')        // quitar italic
      .trim();

  const GarmentTag = ({ label, item }: { label: string; item?: any }) => {
    if (!item) return null;
    const color = item.color_primary && item.color_primary !== '<UNKNOWN>'
      ? `${item.color_primary} · ` : '';
    return (
      <View style={styles.garmentTag}>
        <Text style={styles.garmentLabel}>{label}</Text>
        <Text style={styles.garmentValue}>{color}{item.subcategory}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola 👋</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* Generador */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>¿Para qué te vas a vestir?</Text>

          <TextInput
            style={styles.input}
            placeholder="ej. Cena de negocios, brunch con amigos..."
            placeholderTextColor={Colors.textMuted}
            value={event}
            onChangeText={setEvent}
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="Ciudad"
            placeholderTextColor={Colors.textMuted}
            value={city}
            onChangeText={setCity}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={generateOutfit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <Text style={styles.buttonText}>✨ Generar outfit</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Resultado */}
        {outfit && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Tu outfit para hoy</Text>

            <GarmentTag label="👕 Top" item={outfit.top} />
            <GarmentTag label="👖 Bottom" item={outfit.bottom} />
            <GarmentTag label="👟 Calzado" item={outfit.footwear} />
            <GarmentTag label="✨ Accesorio" item={outfit.accessory} />

            <View style={styles.divider} />
            <Text style={styles.explanation}>{stripMarkdown(outfit.explanation ?? '')}</Text>

            {weather && (
              <View style={styles.garmentTag}>
                <Text style={styles.garmentLabel}>🌤️ Clima</Text>
                <Text style={styles.garmentValue}>
                  {weather.temp_c.toFixed(0)}°C · {weather.description}
                </Text>
              </View>
            )}
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Puntuación</Text>
              <Text style={styles.scoreValue}>{(outfit.total_score ?? 0).toFixed(1)} / 10</Text>
            </View>
          </View>
        )}

        {/* Accesos rápidos */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('Closet')}
          >
            <Text style={styles.quickIcon}>👔</Text>
            <Text style={styles.quickLabel}>Mi clóset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('Shop')}
          >
            <Text style={styles.quickIcon}>🛍️</Text>
            <Text style={styles.quickLabel}>Tienda</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('TryOn')}
          >
            <Text style={styles.quickIcon}>🪞</Text>
            <Text style={styles.quickLabel}>Try-On</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  email: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  logoutBtn: { padding: 8 },
  logoutText: { color: Colors.textMuted, fontSize: 14 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  resultCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
    gap: 10,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.accent,
    marginBottom: 4,
  },
  garmentTag: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  garmentLabel: { color: Colors.textSecondary, fontSize: 14 },
  garmentValue: { color: Colors.textPrimary, fontSize: 14, fontWeight: '500' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  explanation: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  scoreLabel: { color: Colors.textMuted, fontSize: 13 },
  scoreValue: { color: Colors.accent, fontSize: 14, fontWeight: '700' },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickIcon: { fontSize: 24 },
  quickLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '500' },
});
