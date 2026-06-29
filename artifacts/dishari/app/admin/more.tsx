import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useCallback, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
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
      <ScreenHeader
        title="More"
        icon="more-horizontal"
        subtitle="Eggs · Advances · Reports · Settings"
        bottomElement={
          <View style={{ flexDirection: "row", gap: 4 }}>
            {sections.map((s) => (
              <Pressable
                key={s.key}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 8,
                  gap: 4,
                  borderRadius: 10,
                  backgroundColor: activeSection === s.key ? "rgba(255,255,255,0.22)" : "transparent",
                }}
                onPress={() => setActiveSection(s.key)}
              >
                <Feather
                  name={s.icon as "settings"}
                  size={16}
                  color={activeSection === s.key ? "#fff" : "rgba(255,255,255,0.6)"}
                />
                <Text style={{
                  fontSize: 11, fontWeight: "700",
                  color: activeSection === s.key ? "#fff" : "rgba(255,255,255,0.6)",
                }}>
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>
        }
      />

      <View style={styles.monthNavWrapper}>
        <View style={[styles.monthNav, { backgroundColor: colors.card }]}>
          <Pressable onPress={() => setMonth(prevMonth(month))} style={styles.navArrow}>
            <Feather name="chevron-left" size={20} color={colors.primary} />
          </Pressable>
          <Text style={[styles.monthText, { color: colors.foreground }]}>{monthLabel(month)}</Text>
          <Pressable onPress={() => setMonth(nextMonth(month))} style={styles.navArrow}>
            <Feather name="chevron-right" size={20} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      {activeSection === "eggs" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}>
          <View style={[styles.priceCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Current Egg Price</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.priceVal, { color: colors.foreground }]}>₹{settings.eggPrice} <Text style={{ fontSize: 14, fontWeight: "400", color: colors.mutedForeground }}>per egg</Text></Text>
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

          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginBottom: 20 }]} onPress={() => { setEggForm({ memberId: "", date: `${month}-${String(new Date().getDate()).padStart(2,"0")}`, count: "" }); setEggModal(true); }}>
            <LinearGradient colors={["#E25C14", "#AD3806"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addBtn}>
              <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Add Egg Entry</Text>
            </LinearGradient>
          </Pressable>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Egg Entries — {monthLabel(month)}</Text>
          {monthEggs.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No egg records this month</Text>
          ) : monthEggs.slice().reverse().map((e) => (
            <View key={e.id} style={[styles.listItem, { backgroundColor: colors.card }]}>
              <View style={[styles.iconWrap, { backgroundColor: "#D4500A20" }]}>
                <Feather name="circle" size={18} color="#D4500A" />
              </View>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.foreground }]}>{getMemberName(e.memberId)}</Text>
                <Text style={[styles.itemDate, { color: colors.mutedForeground }]}>{e.date}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.itemAmount, { color: colors.foreground }]}>{e.count} eggs</Text>
                <Text style={[styles.itemAmountSub, { color: colors.primary }]}>₹{(e.count * settings.eggPrice).toFixed(0)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {activeSection === "advances" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}>
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginBottom: 20 }]} onPress={() => setAdvModal(true)}>
            <LinearGradient colors={["#E25C14", "#AD3806"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addBtn}>
              <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Add Advance</Text>
            </LinearGradient>
          </Pressable>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Advances — {monthLabel(month)}</Text>
          {monthAdvances.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No advances this month</Text>
          ) : monthAdvances.slice().reverse().map((a) => (
            <View key={a.id} style={[styles.listItem, { backgroundColor: colors.card }]}>
              <View style={[styles.iconWrap, { backgroundColor: "#16A34A20" }]}>
                <Feather name="credit-card" size={18} color="#16A34A" />
              </View>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.foreground }]}>{getMemberName(a.memberId)}</Text>
                <Text style={[styles.itemDate, { color: colors.mutedForeground }]}>{a.date} · {a.method}{a.notes ? ` · ${a.notes}` : ""}</Text>
              </View>
              <Text style={[styles.itemAmount, { color: "#16A34A" }]}>₹{a.amount}</Text>
              <Pressable onPress={() => Alert.alert("Delete", "Remove this advance?", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => deleteAdvance(a.id) }])} style={{ padding: 6 }}>
                <Feather name="trash-2" size={18} color={colors.destructive} />
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
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No data</Text>}
          renderItem={({ item: b }) => (
            <View style={[styles.reportCard, { backgroundColor: colors.card }]}>
              <View style={styles.reportHeader}>
                <View style={[styles.avatar, { backgroundColor: "#D4500A20" }]}>
                  <Text style={[styles.avatarText, { color: "#D4500A" }]}>{b.memberName.charAt(0)}</Text>
                </View>
                <Text style={[styles.reportName, { color: colors.foreground }]}>{b.memberName}</Text>
                <View style={[styles.dueBadge, { backgroundColor: b.dueAmount > 0 ? "#DC262618" : "#16A34A18" }]}>
                  <Text style={[styles.dueText, { color: b.dueAmount > 0 ? "#DC2626" : "#16A34A" }]}>
                    {b.dueAmount > 0 ? `Due ₹${b.dueAmount.toFixed(0)}` : `Cr ₹${b.creditBalance.toFixed(0)}`}
                  </Text>
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: "#F2E6DF" }]} />
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
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}>
          <View style={[styles.settingCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.settingTitle, { color: colors.foreground }]}>Cook Salary</Text>
            <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>Fixed amount charged per member per month</Text>
            <View style={styles.settingInputRow}>
              <Text style={[styles.settingVal, { color: colors.foreground }]}>₹{settings.cookSalary} <Text style={{ fontSize: 14, fontWeight: "400", color: colors.mutedForeground }}>/ member</Text></Text>
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

          <View style={[styles.settingCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.settingTitle, { color: colors.foreground }]}>Egg Price</Text>
            <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>Current price per egg</Text>
            <View style={styles.settingInputRow}>
              <Text style={[styles.settingVal, { color: colors.foreground }]}>₹{settings.eggPrice} <Text style={{ fontSize: 14, fontWeight: "400", color: colors.mutedForeground }}>/ egg</Text></Text>
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

          <View style={[styles.settingCard, { backgroundColor: "#FFF4EE" }]}>
            <Text style={[styles.settingTitle, { color: "#D4500A" }]}>Admin Login</Text>
            <Text style={[styles.settingDesc, { color: "#7A3F1E" }]}>Login ID: <Text style={{ fontWeight: "700" }}>admin</Text></Text>
            <Text style={[styles.settingDesc, { color: "#9B7B68", marginTop: 4 }]}>Members log in using their phone number and the password set for them.</Text>
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
                    style={[styles.memberChip, { backgroundColor: eggForm.memberId === m.id ? "#D4500A" : colors.muted }]}
                    onPress={() => setEggForm((f) => ({ ...f, memberId: m.id }))}>
                    <Text style={{ color: eggForm.memberId === m.id ? "#fff" : colors.mutedForeground, fontWeight: "600", fontSize: 13 }}>{m.name.split(" ")[0]}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>DATE</Text>
              <TextInput style={[styles.formInput, { color: colors.foreground }]}
                value={eggForm.date} onChangeText={(v) => setEggForm((f) => ({ ...f, date: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground} />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>NUMBER OF EGGS</Text>
              <TextInput style={[styles.formInput, { color: colors.foreground }]}
                value={eggForm.count} onChangeText={(v) => setEggForm((f) => ({ ...f, count: v }))} placeholder="0" placeholderTextColor={colors.mutedForeground} keyboardType="numeric" />
            </View>

            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: 8, marginBottom: 20 }]} onPress={saveEgg}>
              <LinearGradient colors={["#E25C14", "#AD3806"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save Egg Entry</Text>
              </LinearGradient>
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
                    style={[styles.memberChip, { backgroundColor: advForm.memberId === m.id ? "#D4500A" : colors.muted }]}
                    onPress={() => setAdvForm((f) => ({ ...f, memberId: m.id }))}>
                    <Text style={{ color: advForm.memberId === m.id ? "#fff" : colors.mutedForeground, fontWeight: "600", fontSize: 13 }}>{m.name.split(" ")[0]}</Text>
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
                  style={[styles.formInput, { color: colors.foreground }]}
                  value={String((advForm as Record<string, unknown>)[key] ?? "")}
                  onChangeText={(v) => setAdvForm((f) => ({ ...f, [key]: v }))}
                  keyboardType={numeric ? "numeric" : "default"}
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            ))}

            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: 8, marginBottom: 20 }]} onPress={saveAdv}>
              <LinearGradient colors={["#E25C14", "#AD3806"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Add Advance</Text>
              </LinearGradient>
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
              style={[styles.editInput, { color: colors.foreground }]}
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
              <Pressable style={({ pressed }) => [styles.editSaveBtnWrapper, { opacity: pressed ? 0.85 : 1 }]} onPress={confirmEdit}>
                <LinearGradient colors={["#E25C14", "#AD3806"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.editSaveBtn}>
                  <Text style={styles.editSaveText}>Save</Text>
                </LinearGradient>
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
  monthNavWrapper: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  monthNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderRadius: 16, padding: 8,
    shadowColor: "#C04000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
  },
  navArrow: { padding: 8 },
  monthText: { fontSize: 17, fontWeight: "700" },
  priceCard: {
    borderRadius: 20, padding: 18, marginBottom: 20,
    shadowColor: "#C04000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
  },
  priceLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceVal: { fontSize: 24, fontWeight: "700" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, paddingVertical: 16 },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 14 },
  emptyText: { textAlign: "center", paddingVertical: 20, fontSize: 14 },
  listItem: {
    flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16,
    padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "700" },
  itemDate: { fontSize: 12, marginTop: 4 },
  itemAmount: { fontSize: 16, fontWeight: "700" },
  itemAmountSub: { fontSize: 13, marginTop: 2 },
  reportCard: {
    borderRadius: 20, padding: 18, marginBottom: 16,
    shadowColor: "#C04000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
  },
  reportHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700" },
  reportName: { flex: 1, fontSize: 16, fontWeight: "700" },
  dueBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  dueText: { fontSize: 12, fontWeight: "700" },
  divider: { height: 1, marginBottom: 8 },
  reportRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  reportKey: { fontSize: 14 },
  reportVal: { fontSize: 14, fontWeight: "600" },
  settingCard: {
    borderRadius: 20, padding: 18, marginBottom: 16,
    shadowColor: "#C04000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
  },
  settingTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  settingDesc: { fontSize: 13 },
  settingInputRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  settingVal: { fontSize: 20, fontWeight: "700" },
  smallBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  smallBtnText: { fontSize: 13, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "#00000060", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 12, fontWeight: "600", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  formInput: {
    backgroundColor: "#FFF4EE", borderWidth: 1.5, borderColor: "#EDE0D8", 
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 16,
  },
  memberChip: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  saveBtn: { borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  // Inline edit modal styles
  editOverlay: { flex: 1, backgroundColor: "#00000070", justifyContent: "center", alignItems: "center" },
  editSheet: {
    width: "85%", borderRadius: 24, padding: 24,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  editTitle: { fontSize: 20, fontWeight: "800", marginBottom: 6 },
  editSubtitle: { fontSize: 14, marginBottom: 20 },
  editInput: {
    backgroundColor: "#FFF4EE", borderWidth: 1.5, borderColor: "#EDE0D8",
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 24, fontWeight: "700", textAlign: "center", marginBottom: 24,
  },
  editActions: { flexDirection: "row", gap: 12 },
  editCancelBtn: { flex: 1, borderWidth: 1.5, borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  editCancelText: { fontSize: 15, fontWeight: "600" },
  editSaveBtnWrapper: { flex: 1, borderRadius: 16, overflow: "hidden" },
  editSaveBtn: { flex: 1, paddingVertical: 14, alignItems: "center" },
  editSaveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});