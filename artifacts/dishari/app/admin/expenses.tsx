import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Expense, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

const CATEGORIES = [
  { key: "all", label: "All", icon: "list", color: "#374151" },
  { key: "grocery", label: "Grocery", icon: "shopping-bag", color: "#D4500A" },
  { key: "vegetable", label: "Veg", icon: "box", color: "#16A34A" },
  { key: "fish", label: "Fish", icon: "droplet", color: "#0891B2" },
  { key: "meat", label: "Meat", icon: "heart", color: "#DC2626" },
  { key: "gas", label: "Gas", icon: "zap", color: "#D97706" },
  { key: "other", label: "Other", icon: "more-horizontal", color: "#7C3AED" },
];

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function prevMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${names[parseInt(mo) - 1]} ${y}`;
}

const EMPTY_FORM: Omit<Expense, "id"> = {
  type: "grocery", date: new Date().toISOString().slice(0, 10),
  shopName: "", items: "", amount: 0, notes: "",
};

export default function ExpensesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { expenses, addExpense, updateExpense, deleteExpense } = useData();
  const [month, setMonth] = useState(getCurrentMonth());
  const [category, setCategory] = useState("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<Omit<Expense, "id">>(EMPTY_FORM);

  const monthExpenses = expenses.filter((e) => e.date.startsWith(month));
  const filtered = category === "all"
    ? monthExpenses
    : monthExpenses.filter((e) => e.type === category);

  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, date: `${month}-${String(new Date().getDate()).padStart(2, "0")}` });
    setModalVisible(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({ type: e.type, date: e.date, shopName: e.shopName ?? "", items: e.items ?? "", amount: e.amount, notes: e.notes ?? "" });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.amount || form.amount <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }
    if (editing) {
      await updateExpense(editing.id, form);
    } else {
      await addExpense(form);
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
  };

  const handleDelete = (e: Expense) => {
    Alert.alert("Delete", `Delete this expense (₹${e.amount})?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await deleteExpense(e.id);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const getCatInfo = (type: string) =>
    CATEGORIES.find((c) => c.key === type) ?? CATEGORIES[CATEGORIES.length - 1];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.monthNav, { marginTop: Platform.OS === "web" ? 67 : 12 }]}>
        <Pressable onPress={() => setMonth(prevMonth(month))} style={styles.navArrow}>
          <Feather name="chevron-left" size={22} color={colors.primary} />
        </Pressable>
        <View style={styles.monthCenter}>
          <Text style={[styles.monthText, { color: colors.foreground }]}>{monthLabel(month)}</Text>
          <Text style={[styles.monthTotal, { color: colors.primary }]}>Total: ₹{monthTotal.toFixed(0)}</Text>
        </View>
        <Pressable onPress={() => setMonth(nextMonth(month))} style={styles.navArrow}>
          <Feather name="chevron-right" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catContent}>
        {CATEGORIES.map((c) => (
          <Pressable
            key={c.key}
            style={[styles.catChip, { backgroundColor: category === c.key ? c.color : colors.muted, borderColor: category === c.key ? c.color : colors.border }]}
            onPress={() => setCategory(c.key)}
          >
            <Feather name={c.icon as "list"} size={14} color={category === c.key ? "#fff" : colors.mutedForeground} />
            <Text style={[styles.catChipText, { color: category === c.key ? "#fff" : colors.mutedForeground }]}>{c.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {category !== "all" && (
        <View style={[styles.filterTotal, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[{ color: colors.mutedForeground, fontSize: 14 }]}>{CATEGORIES.find(c => c.key === category)?.label} total:</Text>
          <Text style={[{ color: colors.foreground, fontSize: 16, fontWeight: "700" }]}>₹{total.toFixed(0)}</Text>
        </View>
      )}

      <FlatList
        data={filtered.slice().reverse()}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="dollar-sign" size={40} color={colors.muted} />
            <Text style={[{ color: colors.mutedForeground, fontSize: 15 }]}>No expenses found</Text>
          </View>
        }
        renderItem={({ item: e }) => {
          const cat = getCatInfo(e.type);
          return (
            <View style={[styles.expenseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.expenseIcon, { backgroundColor: cat.color + "20" }]}>
                <Feather name={cat.icon as "list"} size={18} color={cat.color} />
              </View>
              <View style={styles.expenseInfo}>
                <Text style={[styles.expenseName, { color: colors.foreground }]}>
                  {cat.label}{e.shopName ? ` · ${e.shopName}` : ""}
                </Text>
                {e.items ? <Text style={[styles.expenseMeta, { color: colors.mutedForeground }]}>{e.items}</Text> : null}
                <Text style={[styles.expenseDate, { color: colors.mutedForeground }]}>{e.date}</Text>
              </View>
              <Text style={[styles.expenseAmount, { color: colors.foreground }]}>₹{e.amount}</Text>
              <Pressable onPress={() => openEdit(e)} style={styles.actionBtn}>
                <Feather name="edit-2" size={16} color={colors.primary} />
              </Pressable>
              <Pressable onPress={() => handleDelete(e)} style={styles.actionBtn}>
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </Pressable>
            </View>
          );
        }}
      />

      <Pressable style={[styles.fab, { backgroundColor: "#D4500A" }]} onPress={openAdd}>
        <Feather name="plus" size={24} color="#fff" />
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editing ? "Edit Expense" : "Add Expense"}
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {CATEGORIES.slice(1).map((c) => (
                    <Pressable
                      key={c.key}
                      style={[styles.catChip, { backgroundColor: form.type === c.key ? c.color : colors.muted, borderColor: form.type === c.key ? c.color : colors.border }]}
                      onPress={() => setForm((f) => ({ ...f, type: c.key as Expense["type"] }))}
                    >
                      <Text style={[styles.catChipText, { color: form.type === c.key ? "#fff" : colors.mutedForeground }]}>{c.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              {[
                { label: "Date *", key: "date", placeholder: "YYYY-MM-DD" },
                { label: "Shop Name", key: "shopName", placeholder: "optional" },
                { label: "Items", key: "items", placeholder: "what was purchased" },
                { label: "Notes", key: "notes", placeholder: "optional" },
              ].map(({ label, key, placeholder }) => (
                <View key={key} style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <TextInput
                    style={[styles.formInput, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    value={String((form as Record<string, unknown>)[key] ?? "")}
                    onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                  />
                </View>
              ))}

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>AMOUNT (₹) *</Text>
                <TextInput
                  style={[styles.formInput, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.amount ? String(form.amount) : ""}
                  onChangeText={(v) => setForm((f) => ({ ...f, amount: parseFloat(v) || 0 }))}
                  keyboardType="numeric"
                />
              </View>

              <Pressable style={[styles.saveBtn, { backgroundColor: "#D4500A" }]} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{editing ? "Update" : "Add Expense"}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 8 },
  navArrow: { padding: 8 },
  monthCenter: { alignItems: "center" },
  monthText: { fontSize: 18, fontWeight: "700" },
  monthTotal: { fontSize: 13, fontWeight: "600" },
  catScroll: { flexGrow: 0 },
  catContent: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  catChipText: { fontSize: 13, fontWeight: "600" },
  filterTotal: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 12, borderWidth: 1,
  },
  expenseCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1,
  },
  expenseIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  expenseInfo: { flex: 1 },
  expenseName: { fontSize: 14, fontWeight: "700" },
  expenseMeta: { fontSize: 12, marginTop: 1 },
  expenseDate: { fontSize: 11, marginTop: 2 },
  expenseAmount: { fontSize: 16, fontWeight: "700" },
  actionBtn: { padding: 6 },
  fab: {
    position: "absolute", right: 20, bottom: 100,
    width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#D4500A", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  modalOverlay: { flex: 1, backgroundColor: "#00000060", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  formGroup: { marginBottom: 14 },
  formLabel: { fontSize: 11, fontWeight: "700", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  formInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  saveBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8, marginBottom: 20 },
  saveBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
