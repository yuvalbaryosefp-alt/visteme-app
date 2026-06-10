import React, { useCallback, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { closetAPI, catalogAPI } from '../services/api';
import { Colors } from '../constants/colors';

interface Garment {
  id: string;
  category: string;
  subcategory: string;
  color_primary: string;
  color_secondary?: string;
  brand?: string;
  formality_score: number;
  is_available: boolean;
}

const CATEGORY_EMOJI: Record<string, string> = {
  top: '👕', bottom: '👖', calzado: '👟',
  outerwear: '🧥', accesorio: '✨',
};

export default function ClosetScreen() {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [addText, setAddText] = useState('');
  const [adding, setAdding] = useState(false);

  const loadGarments = async () => {
    setLoading(true);
    try {
      const { data } = await closetAPI.list({ limit: 100 });
      setGarments(data.garments);
    } catch {
      Alert.alert('Error', 'No se pudo cargar el clóset');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadGarments(); }, []));

  const deleteGarment = (id: string, name: string) => {
    Alert.alert('Eliminar prenda', `¿Eliminar "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            await closetAPI.delete(id);
            setGarments(prev => prev.filter(g => g.id !== id));
          } catch {
            Alert.alert('Error', 'No se pudo eliminar la prenda');
          }
        },
      },
    ]);
  };

  const addGarments = async () => {
    if (!addText.trim()) return;
    setAdding(true);
    try {
      const { data } = await catalogAPI.fromText(addText);
      setAddText('');
      setAddModal(false);
      await loadGarments();
      Alert.alert('✅ Listo', `${data.garments.length} prenda(s) agregada(s)`);
    } catch {
      Alert.alert('Error', 'No se pudo catalogar la prenda');
    } finally {
      setAdding(false);
    }
  };

  const renderGarment = ({ item }: { item: Garment }) => (
    <View style={styles.garmentCard}>
      <View style={styles.garmentLeft}>
        <Text style={styles.garmentEmoji}>
          {CATEGORY_EMOJI[item.category] ?? '👗'}
        </Text>
        <View style={styles.garmentInfo}>
          <Text style={styles.garmentName} numberOfLines={1}>
            {item.color_primary && item.color_primary !== '<UNKNOWN>'
              ? `${item.color_primary} ${item.subcategory}`
              : item.subcategory}
          </Text>
          <Text style={styles.garmentMeta}>
            {item.category} · {item.formality_score}/10
            {item.brand ? ` · ${item.brand}` : ''}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => deleteGarment(item.id, `${item.color_primary} ${item.subcategory}`)}
        style={styles.deleteBtn}
      >
        <Text style={styles.deleteIcon}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mi clóset</Text>
        <Text style={styles.count}>{garments.length} prendas</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.accent} style={{ flex: 1 }} />
      ) : garments.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>👗</Text>
          <Text style={styles.emptyText}>Tu clóset está vacío</Text>
          <Text style={styles.emptySubtext}>
            Toca el botón + para agregar tus prendas
          </Text>
        </View>
      ) : (
        <FlatList
          data={garments}
          keyExtractor={g => g.id}
          renderItem={renderGarment}
          contentContainerStyle={{ padding: 16, gap: 10 }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setAddModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal: agregar prenda */}
      <Modal visible={addModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Agregar prenda</Text>
            <Text style={styles.modalSubtitle}>
              Describe tus prendas en español (puedes agregar varias a la vez)
            </Text>
            <TextInput
              style={[styles.input, { minHeight: 100 }]}
              placeholder="ej. tengo unos jeans azules slim de Levi's y una playera blanca oversize"
              placeholderTextColor={Colors.textMuted}
              value={addText}
              onChangeText={setAddText}
              multiline
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setAddModal(false); setAddText(''); }}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, adding && { opacity: 0.6 }]}
                onPress={addGarments}
                disabled={adding}
              >
                {adding
                  ? <ActivityIndicator color={Colors.background} size="small" />
                  : <Text style={styles.addBtnText}>Agregar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 16,
  },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  count: { fontSize: 14, color: Colors.textMuted },
  garmentCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  garmentLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  garmentEmoji: { fontSize: 28 },
  garmentInfo: { flex: 1 },
  garmentName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  garmentMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  deleteBtn: { padding: 8 },
  deleteIcon: { color: Colors.textMuted, fontSize: 16 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: { fontSize: 56 },
  emptyText: { fontSize: 18, fontWeight: '600', color: Colors.textSecondary },
  emptySubtext: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: Colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { fontSize: 28, color: Colors.background, fontWeight: '300', lineHeight: 32 },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000AA',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 14,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  modalSubtitle: { fontSize: 13, color: Colors.textMuted },
  input: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    color: Colors.textPrimary,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelText: { color: Colors.textSecondary, fontWeight: '600' },
  addBtn: {
    flex: 2, padding: 14, borderRadius: 12,
    backgroundColor: Colors.accent, alignItems: 'center',
  },
  addBtnText: { color: Colors.background, fontWeight: '700', fontSize: 15 },
});
