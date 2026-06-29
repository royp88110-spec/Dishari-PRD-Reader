import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
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

import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

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

type Section = "eggs" | "advances" | "reports" | "settings";

type EditModalState = {
  visible: boolean;
  title: string;
  subtitle: string;
  value: string;
  onSave: (val: string) => void;
};

const EDIT_MODAL_CLOSED: EditModalState = {
  visible: false, title: "", subtitle: "", value: "", onSave: () => {},
};

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    members, eggs, advances, settings,
    setEggEntry, addAdvance, deleteAdvance, updateSettings, calculateAllMonthlyBills,
  } = useData();
  const [activeSection, setActiveSection] = useState<Section>("eggs");
  const [month, setMonth] = useState(getCurrentMonth());

  const [eggModal, setEggModal] = useState(false);
  const [eggForm, setEggForm] = useState({ memberId: "", date: new Date().toISOString().slice(0, 10), count: "" });

  const [advModal, setAdvModal] = useState(false);
  const [advForm, setAdvForm] = useState({ memberId: "", amount: "", date: new Date().toISOString().slice(0, 10), method: "Cash", notes: "" });

  // Cross-platform inline edit modal (replaces Alert.prompt)
  const [editModal, setEditModal] = useState<EditModalState>(EDIT_MODAL_CLOSED);
  const [editInputVal, setEditInputVal] = useState("");

  const openEditModal = (state: Omit<EditModalState, "visible">) => {
    setEditInputVal(state.value);
    setEditModal({ ...state, visible: true });
  };
  const closeEditModal = () => setEditModal(EDIT_MODAL_CLOSED);
  const confirmEdit = () => {
    editModal.onSave(editInputVal);
    closeEditModal();
  };

  const activeMembers = members.filter((m) => m.status === "active");

  const monthEggs = eggs.filter((e) => e.date.startsWith(month));
  const monthAdvances = advances.filter((a) => a.date.startsWith(month));
  const bills = calculateAllMonthlyBills(month);

  const saveEgg = async () => {
    if (!eggForm.memberId || !eggForm.count) return Alert.alert("Error", "Fill all fields");
    await setEggEntry(eggForm.memberId, eggForm.date, parseInt(eggForm.count) || 0);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEggModal(false);
  };

  const saveAdv = async () => {
    if (!advForm.memberId || !advForm.amount) return Alert.alert("Error", "Fill all fields");
    await addAdvance({ memberId: advForm.memberId, amount: parseFloat(advForm.amount) || 0, date: advForm.date, method: advForm.method, notes: advForm.notes });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAdvModal(false);
    setAdvForm({ memberId: "", amount: "", date: new Date().toISOString().slice(0, 10), method: "Cash", notes: "" });
  };

  const getMemberName = (id: string) => members.find((m) => m.id === id)?.name ?? "Unknown";

  const sections: { key: Section; label: string; icon: string }[] = [
    { key: "eggs", label: "Eggs", icon: "circle" },
    { key: "advances", label: "Advances", icon: "credit-card" },
    { key: "reports", label: "Reports", icon: "bar-chart-2" },
    { key: "settings", label: "Settings", icon: "settings" },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.tabRow, { marginTop: insets.top + 12, borderBottomColor: colors.border }]}>
        {sections.map((s) => (
          <Pressable
            key={s.key}
            style={[styles.tabItem, activeSection === s.key && { borderBottomColor: "#D4500A", borderBottomWidth: 2.5 }]}
            onPress={() => setActiveSection(s.key)}
          >
            <Feather name={s.icon as "settings"} size={16} color={activeSection === s.key ? "#D4500A" : colors.mutedForeground} />
            <Text style={[styles.tabLabel, { color: activeSection === s.key ? "#D4500A" : colors.mutedForeground }]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.monthNav, { marginTop: 12 }]}>
        <Pressable onPress={() => setMonth(prevMonth(month))} style={styles.navArrow}>
          <Feather name="chevron-left" size={20} color={colors.primary} />
        </Pressable>
        <Text style={[styles.monthText, { color: colors.foreground }]}>{monthLabel(month)}</Text>
        <Pressable onPress={() => setMonth(nextMonth(month))} style={styles.navArrow}>
          <Feather name="chevron-right" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {activeSection === "eggs" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}>
          <View style={[styles.priceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Current Egg Price</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.priceVal, { color: colors.foreground }]}>₹{settings.eggPrice} per egg</Text>
              <Pressable
                style={[styles.smallBtn, { backgroundColor: "#D4500A20" }]}
                onPress={() => openEditModal({
                  title: "Update Egg Price",
                  subtitle: "Enter new price per egg (₹)",
                  value: String(settings.eggPrice),
                  onSave: (v) => {
                    const p = parseFloat(v);
                    if (!isNaN(p) && p > 0) updateSettings({ eggPrice: p });
                  },
                })}
              >
                <Feather name="edit-2" size={14} color="#D4500A" />
                <Text style={[styles.smallBtnText, { color: "#D4500A" }]}>Edit</Text>
              </Pressable>
            </View>
          </View>

          <Pressable style={[styles.addBtn, { backgroundColor: "#D4500A" }]} onPress={() => { setEggForm({ memberId: "", date: `${month}-${String(new Date().getDate()).padStart(2,"0")}`, count: "" }); setEggModal(true); }}>
            <Feather name="plus" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add Egg Entry</Text>
          </Pressable>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Egg Entries — {monthLabel(month)}</Text>
          {monthEggs.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No egg records this month</Text>
          ) : monthEggs.slice().reverse().map((e) => (
            <View key={e.id} style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.iconWrap, { backgroundColor: "#D4500A20" }]}>
                <Feather name="circle" size={16} color="#D4500A" />
              </View>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.foreground }]}>{getMemberName(e.memberId)}</Text>
                <Text style={[styles.itemDate, { color: colors.mutedForeground }]}>{e.date}</Text>
              </View>
              <Text style={[styles.itemAmount, { color: colors.foreground }]}>{e.count} eggs</Text>
              <Text style={[styles.itemAmountSub, { color: colors.primary }]}>₹{(e.count * settings.eggPrice).toFixed(0)}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {activeSection === "advances" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}>
          <Pressable style={[styles.addBtn, { backgroundColor: "#D4500A" }]} onPress={() => setAdvModal(true)}>
            <Feather name="plus" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add Advance</Text>
          </Pressable>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Advances — {monthLabel(month)}</Text>
          {monthAdvances.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No advances this month</Text>
          ) : monthAdvances.slice().reverse().map((a) => (
            <View key={a.id} style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.iconWrap, { backgroundColor: "#16A34A20" }]}>
                <Feather name="credit-card" size={16} color="#16A34A" />
              </View>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.foreground }]}>{getMemberName(a.memberId)}</Text>
                <Text style={[styles.itemDate, { color: colors.mutedForeground }]}>{a.date} · {a.method}{a.notes ? ` · ${a.notes}` : ""}</Text>
              </View>
              <Text style={[styles.itemAmount, { color: "#16A34A" }]}>₹{a.amount}</Text>
              <Pressable onPress={() => Alert.alert("Delete", "Remove this advance?", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => deleteAdvance(a.id) }])}>
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      {activeSection === "reports" && (
        <FlatList
          data={bills}
          keyExtractor={(b) => b.memberId}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No data</Text>}
          renderItem={({ item: b }) => (
            <View style={[styles.reportCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.reportHeader}>
                <View style={[styles.avatar, { backgroundColor: "#D4500A20" }]}>
                  <Text style={[styles.avatarText, { color: "#D4500A" }]}>{b.memberName.charAt(0)}</Text>
                </View>
                <Text style={[styles.reportName, { color: colors.foreground }]}>{b.memberName}</Text>
                <View style={[styles.dueBadge, { backgroundColor: b.dueAmount > 0 ? "#DC262620" : "#16A34A20" }]}>
                  <Text style={[styles.dueText, { color: b.dueAmount > 0 ? "#DC2626" : "#16A34A" }]}>
                    {b.dueAmount > 0 ? `Due ₹${b.dueAmount.toFixed(0)}` : `Cr ₹${b.creditBalance.toFixed(0)}`}
                  </Text>
                </View>
              </View>
              {[
                ["Meals", `${b.mealCount} × ₹${b.perMealCost.toFixed(1)} = ₹${b.mealBill.toFixed(0)}`],
                ["Eggs", `${b.eggCount} × ₹${settings.eggPrice} = ₹${b.eggBill.toFixed(0)}`],
                ["Cook Salary", `₹${b.cookShare.toFixed(0)}`],
                ["Gross Bill", `₹${b.grossBill.toFixed(0)}`],
                ["Advance Paid", `₹${b.totalAdvance.toFixed(0)}`],
              ].map(([k, v]) => (
                <View key={k} style={styles.reportRow}>
                  <Text style={[styles.reportKey, { color: colors.mutedForeground }]}>{k}</Text>
                  <Text style={[styles.reportVal, { color: colors.foreground }]}>{v}</Text>
                </View>
              ))}
            </View>
          )}
        />
      )}

      {activeSection === "settings" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}>
          <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.settingTitle, { color: colors.foreground }]}>Cook Salary</Text>
            <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>Fixed amount charged per member per month</Text>
            <View style={styles.settingInputRow}>
              <Text style={[styles.settingVal, { color: colors.foreground }]}>₹{settings.cookSalary} / member</Text>
              <Pressable
                style={[styles.smallBtn, { backgroundColor: "#D4500A20" }]}
                onPress={() => openEditModal({
                  title: "Cook Salary",
                  subtitle: "Enter amount per member (₹)",
                  value: String(settings.cookSalary),
                  onSave: (v) => {
                    const p = parseFloat(v);
                    if (!isNaN(p) && p >= 0) updateSettings({ cookSalary: p });
                  },
                })}
              >
                <Feather name="edit-2" size={14} color="#D4500A" />
                <Text style={[styles.smallBtnText, { color: "#D4500A" }]}>Edit</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.settingTitle, { color: colors.foreground }]}>Egg Price</Text>
            <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>Current price per egg</Text>
            <View style={styles.settingInputRow}>
              <Text style={[styles.settingVal, { color: colors.foreground }]}>₹{settings.eggPrice} / egg</Text>
              <Pressable
                style={[styles.smallBtn, { backgroundColor: "#D4500A20" }]}
                onPress={() => openEditModal({
                  title: "Egg Price",
                  subtitle: "Enter price per egg (₹)",
                  value: String(settings.eggPrice),
                  onSave: (v) => {
                    const p = parseFloat(v);
                    if (!isNaN(p) && p > 0) updateSettings({ eggPrice: p });
                  },
                })}
              >
                <Feather name="edit-2" size={14} color="#D4500A" />
                <Text style={[styles.smallBtnText, { color: "#D4500A" }]}>Edit</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.settingCard, { backgroundColor: "#FFF0E6", borderColor: "#E8D5CA" }]}>
            <Text style={[styles.settingTitle, { color: "#D4500A" }]}>Admin Credentials</Text>
            <Text style={[styles.settingDesc, { color: "#7A3F1E" }]}>ID: admin · Password: admin123</Text>
            <Text style={[styles.settingDesc, { color: "#9B7B68", marginTop: 4 }]}>Share member phone + password for member login</Text>
          </View>
        </ScrollView>
      )}

      {/* ── Egg entry modal ── */}
      <Modal visible={eggModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Egg Entry</Text>
              <Pressable onPress={() => setEggModal(false)}><Feather name="x" size={22} color={colors.mutedForeground} /></Pressable>
            </View>

            <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>MEMBER</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {activeMembers.map((m) => (
                  <Pressable key={m.id}
                    style={[styles.memberChip, { borderColor: eggForm.memberId === m.id ? "#D4500A" : colors.border, backgroundColor: eggForm.memberId === m.id ? "#D4500A20" : colors.muted }]}
                    onPress={() => setEggForm((f) => ({ ...f, memberId: m.id }))}>
                    <Text style={{ color: eggForm.memberId === m.id ? "#D4500A" : colors.mutedForeground, fontWeight: "600" }}>{m.name.split(" ")[0]}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>DATE</Text>
              <TextInput style={[styles.formInput, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]}
                value={eggForm.date} onChangeText={(v) => setEggForm((f) => ({ ...f, date: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground} />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>NUMBER OF EGGS</Text>
              <TextInput style={[styles.formInput, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]}
                value={eggForm.count} onChangeText={(v) => setEggForm((f) => ({ ...f, count: v }))} placeholder="0" placeholderTextColor={colors.mutedForeground} keyboardType="numeric" />
            </View>

            <Pressable style={[styles.saveBtn, { backgroundColor: "#D4500A" }]} onPress={saveEgg}>
              <Text style={styles.saveBtnText}>Save Egg Entry</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Advance modal ── */}
      <Modal visible={advModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Advance</Text>
              <Pressable onPress={() => setAdvModal(false)}><Feather name="x" size={22} color={colors.mutedForeground} /></Pressable>
            </View>

            <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>MEMBER</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {activeMembers.map((m) => (
                  <Pressable key={m.id}
                    style={[styles.memberChip, { borderColor: advForm.memberId === m.id ? "#D4500A" : colors.border, backgroundColor: advForm.memberId === m.id ? "#D4500A20" : colors.muted }]}
                    onPress={() => setAdvForm((f) => ({ ...f, memberId: m.id }))}>
                    <Text style={{ color: advForm.memberId === m.id ? "#D4500A" : colors.mutedForeground, fontWeight: "600" }}>{m.name.split(" ")[0]}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {[
              { label: "AMOUNT (₹)", key: "amount", numeric: true },
              { label: "DATE", key: "date" },
              { label: "PAYMENT METHOD", key: "method" },
              { label: "NOTES", key: "notes" },
            ].map(({ label, key, numeric }) => (
              <View key={key} style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <TextInput
                  style={[styles.formInput, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]}
                  value={String((advForm as Record<string, unknown>)[key] ?? "")}
                  onChangeText={(v) => setAdvForm((f) => ({ ...f, [key]: v }))}
                  keyboardType={numeric ? "numeric" : "default"}
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            ))}

            <Pressable style={[styles.saveBtn, { backgroundColor: "#D4500A" }]} onPress={saveAdv}>
              <Text style={styles.saveBtnText}>Add Advance</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Cross-platform inline edit modal (replaces Alert.prompt) ── */}
      <Modal visible={editModal.visible} animationType="fade" transparent statusBarTranslucent>
        <KeyboardAvoidingView
          style={styles.editOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeEditModal} />
          <View style={[styles.editSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.editTitle, { color: colors.foreground }]}>{editModal.title}</Text>
            <Text style={[styles.editSubtitle, { color: colors.mutedForeground }]}>{editModal.subtitle}</Text>
            <TextInput
              style={[styles.editInput, { borderColor: "#D4500A", backgroundColor: colors.muted, color: colors.foreground }]}
              value={editInputVal}
              onChangeText={setEditInputVal}
              keyboardType="numeric"
              autoFocus
              selectTextOnFocus
              placeholderTextColor={colors.mutedForeground}
            />
            <View style={styles.editActions}>
              <Pressable
                style={[styles.editCancelBtn, { borderColor: colors.border }]}
                onPress={closeEditModal}
              >
                <Text style={[styles.editCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.editSaveBtn} onPress={confirmEdit}>
                <Text style={styles.editSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  tabRow: {
    flexDirection: "row", borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 10, gap: 4, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabLabel: { fontSize: 11, fontWeight: "700" },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 8 },
  navArrow: { padding: 8 },
  monthText: { fontSize: 16, fontWeight: "700", minWidth: 130, textAlign: "center" },
  priceCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 12 },
  priceLabel: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceVal: { fontSize: 18, fontWeight: "700" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14, marginBottom: 16 },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  emptyText: { textAlign: "center", paddingVertical: 20, fontSize: 14 },
  listItem: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: "700" },
  itemDate: { fontSize: 12, marginTop: 2 },
  itemAmount: { fontSize: 15, fontWeight: "700" },
  itemAmountSub: { fontSize: 12 },
  reportCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  reportHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "700" },
  reportName: { flex: 1, fontSize: 16, fontWeight: "700" },
  dueBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  dueText: { fontSize: 13, fontWeight: "700" },
  reportRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderTopWidth: 1, borderTopColor: "#F0E0D6" },
  reportKey: { fontSize: 13 },
  reportVal: { fontSize: 13, fontWeight: "600" },
  settingCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 12 },
  settingTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  settingDesc: { fontSize: 13 },
  settingInputRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  settingVal: { fontSize: 18, fontWeight: "700" },
  smallBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  smallBtnText: { fontSize: 13, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "#00000060", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  formGroup: { marginBottom: 14 },
  formLabel: { fontSize: 11, fontWeight: "700", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  formInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  memberChip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  saveBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8, marginBottom: 20 },
  saveBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  // Inline edit modal styles
  editOverlay: { flex: 1, backgroundColor: "#00000070", justifyContent: "center", alignItems: "center" },
  editSheet: {
    width: "85%", borderRadius: 20, padding: 24,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  editTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  editSubtitle: { fontSize: 13, marginBottom: 16 },
  editInput: {
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 22, fontWeight: "700",
    textAlign: "center", marginBottom: 20,
  },
  editActions: { flexDirection: "row", gap: 10 },
  editCancelBtn: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  editCancelText: { fontSize: 15, fontWeight: "600" },
  editSaveBtn: { flex: 1, backgroundColor: "#D4500A", borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  editSaveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
