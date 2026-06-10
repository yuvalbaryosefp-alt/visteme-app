import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Linking, ActivityIndicator, Alert,
} from 'react-native';
import { shopAPI } from '../services/api';
import { Colors } from '../constants/colors';

interface Product {
  id: string;
  name: string;
  brand: string;
  store_name: string;
  category: string;
  color_primary: string;
  price_mxn: number;
  affiliate_url: string;
  style_tags: string[];
}

interface Recommendation {
  product: Product;
  score: number;
  reason: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  top: '👕', bottom: '👖', calzado: '👟',
  outerwear: '🧥', accesorio: '✨',
};

export default function ShopScreen() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await shopAPI.recommendations();
        setRecommendations(data.recommendations);
      } catch {
        Alert.alert('Error', 'No se pudieron cargar las recomendaciones');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openProduct = async (rec: Recommendation) => {
    try {
      await shopAPI.trackClick(rec.product.id);
    } catch { /* seguir aunque falle el tracking */ }
    Linking.openURL(rec.product.affiliate_url);
  };

  const renderItem = ({ item }: { item: Recommendation }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.emoji}>
          {CATEGORY_EMOJI[item.product.category] ?? '🛍️'}
        </Text>
        <View style={styles.cardInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.product.name}</Text>
          <Text style={styles.brand}>{item.product.brand} · {item.product.store_name}</Text>
        </View>
        <Text style={styles.price}>${item.product.price_mxn.toFixed(0)}</Text>
      </View>

      <Text style={styles.reason}>{item.reason}</Text>

      <View style={styles.tags}>
        {item.product.style_tags.slice(0, 3).map(t => (
          <View key={t} style={styles.tag}>
            <Text style={styles.tagText}>{t}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.shopBtn} onPress={() => openProduct(item)}>
        <Text style={styles.shopBtnText}>Ver en tienda →</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accent} size="large" />
        <Text style={styles.loadingText}>Analizando tu clóset...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Para ti</Text>
        <Text style={styles.subtitle}>Seleccionado según tu estilo y lo que te falta</Text>
      </View>

      {recommendations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🛍️</Text>
          <Text style={styles.emptyText}>Agrega prendas a tu clóset</Text>
          <Text style={styles.emptySubtext}>
            Las recomendaciones aparecen cuando tenemos prendas para analizar
          </Text>
        </View>
      ) : (
        <FlatList
          data={recommendations}
          keyExtractor={r => r.product.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 14 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: Colors.textMuted, fontSize: 14 },
  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  emoji: { fontSize: 32, lineHeight: 40 },
  cardInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, lineHeight: 20 },
  brand: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  price: { fontSize: 16, fontWeight: '700', color: Colors.accent },
  reason: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  tags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagText: { fontSize: 11, color: Colors.textMuted },
  shopBtn: {
    backgroundColor: Colors.accent + '20',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  shopBtnText: { color: Colors.accent, fontWeight: '600', fontSize: 14 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  emptyIcon: { fontSize: 56 },
  emptyText: { fontSize: 18, fontWeight: '600', color: Colors.textSecondary },
  emptySubtext: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
});
