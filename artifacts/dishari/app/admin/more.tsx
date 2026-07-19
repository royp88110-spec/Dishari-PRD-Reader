import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { MemberAvatar } from "@/components/MemberAvatar";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
import type { Fine, PaymentSubmission } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { useRefresh } from "@/hooks/useRefresh";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Animated shortcut tab item ───────────────────────────────────────────────

const PRIMARY = "#4F46E5";
const INACTIVE_FG = "#64748B";
const EMERALD = "#34D399";
const ORANGE = "#FB923C";
const RED = "#F43F5E";

function ShortcutTab({
  icon,
  label,
  active,
  onPress,
  badge,
}: {
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
  badge?: number;
}) {
  return (
    <Pressable style={styles.tabTouchable} onPress={onPress}>
      <View style={[styles.tabInner, active && { backgroundColor: PRIMARY }]}>
        <View>
          <Feather name={icon as "settings"} size={14} color={active ? "#fff" : INACTIVE_FG} />
          {badge != null && badge > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{badge > 9 ? "9+" : badge}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.tabLabel, active && { color: "#fff" }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = "eggs" | "fines" | "advances" | "reports" | "announce" | "settings" | "payments";

type EditModalState = {
  visible: boolean;
  title: string;
  subtitle: string;
  value: string;
  onSave: (val: string) => void | Promise<void>;
};
const EDIT_MODAL_CLOSED: EditModalState = {
  visible: false, title: "", subtitle: "", value: "", onSave: () => {},
};

const TODAY = new Date().toISOString().slice(0, 10);

type PaymentFilter = "all" | "pending" | "approved" | "rejected";

// ─── MoreScreen ───────────────────────────────────────────────────────────────

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    members, eggs, advances, fines, settings, announcements,
    upiSettings, paymentSubmissions,
    setEggEntry, addAdvance, deleteAdvance,
    addFine, updateFine, deleteFine,
    updateSettings, calculateAllMonthlyBills,
    addAnnouncement, deleteAnnouncement,
    saveUpiSettings, approvePaymentSubmission, rejectPaymentSubmission,
  } = useData();

  const { refreshing, onRefresh } = useRefresh();
  const [activeSection, setActiveSection] = useState<Section>("eggs");
  const [month, setMonth] = useState(getCurrentMonth());

  // Egg state
  const [eggModal, setEggModal]     = useState(false);
  const [eggForm, setEggForm]       = useState({ memberId: "", date: TODAY, count: "" });
  const [isSavingEgg, setIsSavingEgg] = useState(false);

  // Advance state
  const [advModal, setAdvModal]     = useState(false);
  const [advForm, setAdvForm]       = useState({ memberId: "", amount: "", date: TODAY, method: "Cash", notes: "" });
  const [isSavingAdv, setIsSavingAdv] = useState(false);

  // Fine state
  const [fineModal, setFineModal]       = useState(false);
  const [editingFine, setEditingFine]   = useState<Fine | null>(null);
  const [fineForm, setFineForm]         = useState({ memberId: "", amount: "", date: TODAY, reason: "", notes: "" });
  const [isSavingFine, setIsSavingFine] = useState(false);

  // Announcement state
  const [annModal, setAnnModal]       = useState(false);
  const [annForm, setAnnForm]         = useState({ title: "", body: "" });
  const [isSavingAnn, setIsSavingAnn] = useState(false);

  // Inline numeric edit modal
  const [editModal, setEditModal]         = useState<EditModalState>(EDIT_MODAL_CLOSED);
  const [editInputVal, setEditInputVal]   = useState("");

  // UPI Settings state
  const [upiForm, setUpiForm] = useState({
    upiId: "",
    accountHolderName: "",
    paymentNote: "",
  });
  const [upiQrBase64, setUpiQrBase64] = useState<string | null>(null);
  const [isSavingUpi, setIsSavingUpi] = useState(false);

  // Payment admin state
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("pending");
  const [verifyModal, setVerifyModal] = useState(false);
  const [verifyingSub, setVerifyingSub] = useState<PaymentSubmission | null>(null);
  const [approvedAmountInput, setApprovedAmountInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [screenshotModalVisible, setScreenshotModalVisible] = useState(false);
  const [fullScreenshot, setFullScreenshot] = useState<string | null>(null);
  const [rejectNotesInput, setRejectNotesInput] = useState("");
  const [showRejectNotes, setShowRejectNotes] = useState(false);

  // Sync UPI form when settings load
  useEffect(() => {
    if (upiSettings) {
      setUpiForm({
        upiId: upiSettings.upiId,
        accountHolderName: upiSettings.accountHolderName,
        paymentNote: upiSettings.paymentNote ?? "",
      });
      setUpiQrBase64(upiSettings.qrCodeBase64);
    }
  }, [upiSettings]);

  const openEditModal = (state: Omit<EditModalState, "visible">) => {
    setEditInputVal(state.value);
    setEditModal({ ...state, visible: true });
  };
  const closeEditModal = () => setEditModal(EDIT_MODAL_CLOSED);
  const confirmEdit = async () => {
    try {
      await editModal.onSave(editInputVal);
      closeEditModal();
    } catch (err) {
      Alert.alert("Save Failed", (err as Error).message || "Could not update setting.");
    }
  };

  const activeMembers  = members.filter((m) => m.status === "active");
  const getMemberName  = (id: string) => members.find((m) => m.id === id)?.name ?? "Unknown";

  const monthEggs     = eggs.filter((e) => e.date.startsWith(month));
  const monthAdvances = advances.filter((a) => a.date.startsWith(month));
  const monthFines    = fines.filter((f) => f.date.startsWith(month));
  const bills         = calculateAllMonthlyBills(month);

  // Payments
  const pendingCount = paymentSubmissions.filter((s) => s.status === "pending").length;
  const filteredSubmissions = paymentFilter === "all"
    ? paymentSubmissions
    : paymentSubmissions.filter((s) => s.status === paymentFilter);

  // ── Egg save ──
  const saveEgg = async () => {
    if (!eggForm.memberId) return Alert.alert("Validation Error", "Please select a member.");
    if (!eggForm.count)    return Alert.alert("Validation Error", "Please enter the number of eggs.");
    setIsSavingEgg(true);
    try {
      await setEggEntry(eggForm.memberId, eggForm.date, parseInt(eggForm.count) || 0);
      setEggModal(false);
    } catch (err) {
      Alert.alert("Save Failed", (err as Error).message || "Could not save egg entry.");
    } finally {
      setIsSavingEgg(false);
    }
  };

  // ── Advance save ──
  const saveAdv = async () => {
    if (!advForm.memberId) return Alert.alert("Validation Error", "Please select a member.");
    if (!advForm.amount || parseFloat(advForm.amount) <= 0) return Alert.alert("Validation Error", "Please enter a valid amount.");
    setIsSavingAdv(true);
    try {
      await addAdvance({ memberId: advForm.memberId, amount: parseFloat(advForm.amount) || 0, date: advForm.date, method: advForm.method, notes: advForm.notes });
      setAdvModal(false);
      setAdvForm({ memberId: "", amount: "", date: TODAY, method: "Cash", notes: "" });
    } catch (err) {
      Alert.alert("Save Failed", (err as Error).message || "Could not save advance.");
    } finally {
      setIsSavingAdv(false);
    }
  };

  // ── Fine open (add / edit) ──
  const openAddFine = () => {
    setEditingFine(null);
    setFineForm({ memberId: "", amount: "", date: `${month}-${String(new Date().getDate()).padStart(2,"0")}`, reason: "", notes: "" });
    setFineModal(true);
  };
  const openEditFine = (f: Fine) => {
    setEditingFine(f);
    setFineForm({ memberId: f.memberId, amount: String(f.amount), date: f.date, reason: f.reason, notes: f.notes ?? "" });
    setFineModal(true);
  };

  // ── Fine save ──
  const saveFine = async () => {
    if (!fineForm.memberId)                                return Alert.alert("Validation Error", "Please select a member.");
    if (!fineForm.amount || parseFloat(fineForm.amount) <= 0) return Alert.alert("Validation Error", "Please enter a valid amount.");
    if (!fineForm.reason.trim())                           return Alert.alert("Validation Error", "Reason is required.");
    setIsSavingFine(true);
    try {
      const payload = {
        memberId: fineForm.memberId,
        amount:   parseFloat(fineForm.amount) || 0,
        date:     fineForm.date,
        reason:   fineForm.reason.trim(),
        ...(editingFine
          ? { notes: fineForm.notes }
          : fineForm.notes.trim() ? { notes: fineForm.notes.trim() } : {}),
      };
      if (editingFine) {
        await updateFine(editingFine.id, payload);
      } else {
        await addFine(payload);
      }
      setFineModal(false);
      setEditingFine(null);
    } catch (err) {
      Alert.alert("Save Failed", (err as Error).message || "Could not save fine.");
    } finally {
      setIsSavingFine(false);
    }
  };

  // ── Announcement save ──
  const saveAnnouncement = async () => {
    if (!annForm.title.trim()) return Alert.alert("Validation Error", "Please enter a title.");
    if (!annForm.body.trim())  return Alert.alert("Validation Error", "Please enter a message.");
    setIsSavingAnn(true);
    try {
      await addAnnouncement(annForm.title.trim(), annForm.body.trim());
      setAnnModal(false);
      setAnnForm({ title: "", body: "" });
    } catch (err) {
      Alert.alert("Save Failed", (err as Error).message || "Could not post announcement.");
    } finally {
      setIsSavingAnn(false);
    }
  };

  // ── UPI Settings save ──
  const pickQrCode = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setUpiQrBase64(result.assets[0].base64);
    }
  };

  const saveUpi = async () => {
    if (!upiForm.upiId.trim()) return Alert.alert("Validation Error", "UPI ID is required.");
    if (!upiForm.accountHolderName.trim()) return Alert.alert("Validation Error", "Account Holder Name is required.");
    setIsSavingUpi(true);
    try {
      await saveUpiSettings({
        upiId: upiForm.upiId.trim(),
        accountHolderName: upiForm.accountHolderName.trim(),
        qrCodeBase64: upiQrBase64,
        paymentNote: upiForm.paymentNote.trim() || null,
      });
    } catch (err) {
      Alert.alert("Save Failed", (err as Error).message || "Could not save UPI settings.");
    } finally {
      setIsSavingUpi(false);
    }
  };

  // ── Payment approval ──
  const openVerifyModal = (sub: PaymentSubmission) => {
    setVerifyingSub(sub);
    setApprovedAmountInput(String(sub.claimedAmount));
    setRejectNotesInput("");
    setShowRejectNotes(false);
    setVerifyModal(true);
  };

  const handleApprove = async () => {
    if (!verifyingSub) return;
    const amount = parseFloat(approvedAmountInput);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid approved amount.");
      return;
    }
    setIsProcessing(true);
    try {
      await approvePaymentSubmission(verifyingSub.id, amount);
      setVerifyModal(false);
    } catch (err) {
      Alert.alert("Approval Failed", (err as Error).message || "Could not approve payment.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!verifyingSub) return;
    setIsProcessing(true);
    try {
      await rejectPaymentSubmission(verifyingSub.id, rejectNotesInput.trim() || undefined);
      setVerifyModal(false);
    } catch (err) {
      Alert.alert("Rejection Failed", (err as Error).message || "Could not reject payment.");
    } finally {
      setIsProcessing(false);
    }
  };

  const sections: { key: Section; label: string; icon: string }[] = [
    { key: "eggs",     label: "Eggs",  icon: "circle"       },
    { key: "fines",    label: "Fines", icon: "alert-circle" },
    { key: "advances", label: "Adv",   icon: "credit-card"  },
    { key: "reports",  label: "Bill",  icon: "bar-chart-2"  },
    { key: "payments", label: "Pay",   icon: "send"         },
    { key: "announce", label: "News",  icon: "bell"         },
    { key: "settings", label: "Setup", icon: "settings"     },
  ];

  const REFRESH = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={[PRIMARY]}
      tintColor={PRIMARY}
    />
  );

  // ── Status helpers ──
  const statusColor = (s: string) =>
    s === "pending" ? ORANGE : s === "approved" ? EMERALD : RED;
  const statusLabel = (s: string) =>
    s === "pending" ? "Pending" : s === "approved" ? "Approved" : "Rejected";
  const statusIcon = (s: string): React.ComponentProps<typeof Feather>["name"] =>
    s === "pending" ? "clock" : s === "approved" ? "check-circle" : "x-circle";

  return (
    <LinearGradient colors={["#7DE7D8", "#B7F5E7", "#DDF5FF"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.screen}>
      <ScreenHeader
        title="More"
        icon="more-horizontal"
        subtitle="Eggs · Fines · Advances · News"
        bottomElement={
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
            {sections.map((s) => (
              <ShortcutTab
                key={s.key}
                icon={s.icon}
                label={s.label}
                active={activeSection === s.key}
                onPress={() => setActiveSection(s.key)}
                badge={s.key === "payments" ? pendingCount : undefined}
              />
            ))}
          </ScrollView>
        }
      />

      {/* Month navigator */}
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

      {/* ══ EGGS ══ */}
      {activeSection === "eggs" && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
          refreshControl={REFRESH}
        >
          <View style={[styles.priceCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Current Egg Price</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.priceVal, { color: colors.foreground }]}>
                ₹{settings.eggPrice}{" "}
                <Text style={{ fontSize: 14, fontWeight: "400", color: colors.mutedForeground }}>per egg</Text>
              </Text>
              <Pressable
                style={[styles.smallBtn, { backgroundColor: "#4F46E518" }]}
                onPress={() => openEditModal({
                  title: "Update Egg Price",
                  subtitle: "Enter new price per egg (₹)",
                  value: String(settings.eggPrice),
                  onSave: async (v) => {
                    const p = parseFloat(v);
                    if (isNaN(p) || p <= 0) throw new Error("Please enter a valid positive number.");
                    await updateSettings({ eggPrice: p });
                  },
                })}
              >
                <Feather name="edit-2" size={14} color={PRIMARY} />
                <Text style={[styles.smallBtnText, { color: PRIMARY }]}>Edit</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginBottom: 20 }]}
            onPress={() => {
              setEggForm({ memberId: "", date: `${month}-${String(new Date().getDate()).padStart(2,"0")}`, count: "" });
              setEggModal(true);
            }}
          >
            <LinearGradient colors={[PRIMARY, "#7C3AED"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addBtn}>
              <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Add Egg Entry</Text>
            </LinearGradient>
          </Pressable>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Egg Entries — {monthLabel(month)}</Text>
          {monthEggs.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No egg records this month</Text>
          ) : monthEggs.slice().reverse().map((e) => (
            <View key={e.id} style={[styles.listItem, { backgroundColor: colors.card }]}>
              <View style={[styles.iconWrap, { backgroundColor: "#4F46E518" }]}>
                <Feather name="circle" size={18} color={PRIMARY} />
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

      {/* ══ FINES ══ */}
      {activeSection === "fines" && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
          refreshControl={REFRESH}
        >
          {monthFines.length > 0 && (
            <View style={[styles.fineSummary, { backgroundColor: "#DC262610", borderColor: "#DC262640" }]}>
              <Feather name="alert-circle" size={16} color="#DC2626" />
              <Text style={[styles.fineSummaryText, { color: "#DC2626" }]}>
                {monthFines.length} fine{monthFines.length !== 1 ? "s" : ""} · Total ₹{monthFines.reduce((s, f) => s + f.amount, 0).toFixed(0)} this month
              </Text>
            </View>
          )}

          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginBottom: 20 }]} onPress={openAddFine}>
            <LinearGradient colors={[PRIMARY, "#7C3AED"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addBtn}>
              <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Add Fine</Text>
            </LinearGradient>
          </Pressable>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Fines — {monthLabel(month)}</Text>
          {monthFines.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No fines this month</Text>
          ) : monthFines.map((f) => (
            <View key={f.id} style={[styles.fineCard, { backgroundColor: colors.card }]}>
              <View style={styles.fineCardTop}>
                <View style={[styles.iconWrap, { backgroundColor: "#DC262618" }]}>
                  <Feather name="alert-circle" size={18} color="#DC2626" />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{getMemberName(f.memberId)}</Text>
                  <Text style={[styles.itemDate, { color: colors.mutedForeground }]}>{f.date} · {f.reason}</Text>
                  {f.notes ? <Text style={[styles.itemDate, { color: colors.mutedForeground, marginTop: 2 }]}>{f.notes}</Text> : null}
                </View>
                <View style={[styles.fineAmountBadge, { backgroundColor: "#DC262618" }]}>
                  <Text style={styles.fineAmountText}>₹{f.amount.toFixed(0)}</Text>
                </View>
              </View>
              <View style={[styles.fineActions, { borderTopColor: colors.border }]}>
                <Pressable style={styles.fineActionBtn} onPress={() => openEditFine(f)}>
                  <Feather name="edit-2" size={14} color={colors.primary} />
                  <Text style={[styles.fineActionText, { color: colors.primary }]}>Edit</Text>
                </Pressable>
                <View style={[styles.fineActionDivider, { backgroundColor: colors.border }]} />
                <Pressable
                  style={styles.fineActionBtn}
                  onPress={() =>
                    Alert.alert("Delete Fine", `Remove ₹${f.amount} fine for ${getMemberName(f.memberId)}?`, [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete", style: "destructive",
                        onPress: async () => {
                          try { await deleteFine(f.id); }
                          catch (err) { Alert.alert("Delete Failed", (err as Error).message || "Could not delete fine."); }
                        },
                      },
                    ])
                  }
                >
                  <Feather name="trash-2" size={14} color="#DC2626" />
                  <Text style={[styles.fineActionText, { color: "#DC2626" }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ══ ADVANCES ══ */}
      {activeSection === "advances" && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
          refreshControl={REFRESH}
        >
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginBottom: 20 }]} onPress={() => setAdvModal(true)}>
            <LinearGradient colors={[PRIMARY, "#7C3AED"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addBtn}>
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
                <Text style={[styles.itemDate, { color: colors.mutedForeground }]}>
                  {a.date} · {a.method}{a.notes ? ` · ${a.notes}` : ""}
                </Text>
              </View>
              <Text style={[styles.itemAmount, { color: "#16A34A" }]}>₹{a.amount}</Text>
              <Pressable
                onPress={() =>
                  Alert.alert("Delete", "Remove this advance?", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete", style: "destructive",
                      onPress: async () => {
                        try { await deleteAdvance(a.id); }
                        catch (err) { Alert.alert("Delete Failed", (err as Error).message || "Could not delete advance."); }
                      },
                    },
                  ])
                }
                style={{ padding: 6 }}
              >
                <Feather name="trash-2" size={18} color={colors.destructive} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ══ REPORTS ══ */}
      {activeSection === "reports" && (
        <FlatList
          data={bills}
          keyExtractor={(b) => b.memberId}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
          refreshControl={REFRESH}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No data</Text>}
          renderItem={({ item: b }) => (
            <View style={[styles.reportCard, { backgroundColor: colors.card }]}>
              <View style={styles.reportHeader}>
                <MemberAvatar name={b.memberName} size={44} bgColor="#4F46E518" textColor={PRIMARY} />
                <Text style={[styles.reportName, { color: colors.foreground }]}>{b.memberName}</Text>
                <View style={[styles.dueBadge, { backgroundColor: b.dueAmount > 0 ? "#DC262618" : "#16A34A18" }]}>
                  <Text style={[styles.dueText, { color: b.dueAmount > 0 ? "#DC2626" : "#16A34A" }]}>
                    {b.dueAmount > 0 ? `Due ₹${b.dueAmount.toFixed(0)}` : `Cr ₹${b.creditBalance.toFixed(0)}`}
                  </Text>
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              {[
                ["Meals",       `${b.mealCount} × ₹${b.perMealCost.toFixed(1)} = ₹${b.mealBill.toFixed(0)}`],
                ["Eggs",        `${b.eggCount} × ₹${settings.eggPrice} = ₹${b.eggBill.toFixed(0)}`],
                ["Cook Salary", `₹${b.cookShare.toFixed(0)}`],
                ...(b.fineTotal > 0 ? [["Fine", `₹${b.fineTotal.toFixed(0)}`] as [string, string]] : []),
                ["Gross Bill",  `₹${b.grossBill.toFixed(0)}`],
                ["Advance Paid",`₹${b.totalAdvance.toFixed(0)}`],
              ].map(([k, v]) => (
                <View key={k} style={styles.reportRow}>
                  <Text style={[styles.reportKey, { color: k === "Fine" ? "#DC2626" : colors.mutedForeground }]}>{k}</Text>
                  <Text style={[styles.reportVal, { color: k === "Fine" ? "#DC2626" : colors.foreground }]}>{v}</Text>
                </View>
              ))}
            </View>
          )}
        />
      )}

      {/* ══ PAYMENTS ══ */}
      {activeSection === "payments" && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
          refreshControl={REFRESH}
        >
          {/* Summary */}
          {pendingCount > 0 && (
            <View style={[styles.paymentSummaryCard, { backgroundColor: `${ORANGE}12`, borderColor: `${ORANGE}30` }]}>
              <Feather name="clock" size={18} color={ORANGE} />
              <Text style={[styles.paymentSummaryText, { color: ORANGE }]}>
                {pendingCount} payment{pendingCount !== 1 ? "s" : ""} pending verification
              </Text>
            </View>
          )}

          {/* Filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={styles.filterRow}>
              {(["pending", "approved", "rejected", "all"] as PaymentFilter[]).map((f) => (
                <Pressable
                  key={f}
                  style={[
                    styles.filterChip,
                    paymentFilter === f && { backgroundColor: PRIMARY },
                  ]}
                  onPress={() => setPaymentFilter(f)}
                >
                  <Text style={[
                    styles.filterChipText,
                    { color: paymentFilter === f ? "#fff" : colors.mutedForeground },
                  ]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {filteredSubmissions.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No {paymentFilter === "all" ? "" : paymentFilter} payments
              </Text>
            </View>
          ) : filteredSubmissions.map((sub) => {
            const sc = statusColor(sub.status);
            return (
              <View key={sub.id} style={[styles.paymentCard, { backgroundColor: colors.card }]}>
                {/* Card Header */}
                <View style={styles.paymentCardHeader}>
                  <MemberAvatar name={getMemberName(sub.memberId)} size={44} bgColor={`${sc}18`} textColor={sc} />
                  <View style={styles.paymentCardInfo}>
                    <Text style={[styles.paymentCardName, { color: colors.foreground }]}>
                      {getMemberName(sub.memberId)}
                    </Text>
                    <Text style={[styles.paymentCardMonth, { color: colors.mutedForeground }]}>
                      {monthLabel(sub.month)} · {fmtDate(sub.submittedAt)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${sc}18` }]}>
                    <Feather name={statusIcon(sub.status)} size={12} color={sc} />
                    <Text style={[styles.statusBadgeText, { color: sc }]}>{statusLabel(sub.status)}</Text>
                  </View>
                </View>

                <View style={[styles.paymentCardDivider, { backgroundColor: colors.border }]} />

                {/* Details */}
                <View style={styles.paymentDetails}>
                  <View style={styles.paymentDetailRow}>
                    <Text style={[styles.paymentDetailLabel, { color: colors.mutedForeground }]}>Claimed</Text>
                    <Text style={[styles.paymentDetailVal, { color: colors.foreground }]}>
                      ₹{sub.claimedAmount.toFixed(2)}
                    </Text>
                  </View>
                  {sub.approvedAmount != null && (
                    <View style={styles.paymentDetailRow}>
                      <Text style={[styles.paymentDetailLabel, { color: colors.mutedForeground }]}>Approved</Text>
                      <Text style={[styles.paymentDetailVal, { color: EMERALD, fontWeight: "700" }]}>
                        ₹{sub.approvedAmount.toFixed(2)}
                      </Text>
                    </View>
                  )}
                  {sub.utr ? (
                    <View style={styles.paymentDetailRow}>
                      <Text style={[styles.paymentDetailLabel, { color: colors.mutedForeground }]}>UTR / Txn ID</Text>
                      <Text style={[styles.paymentDetailVal, { color: colors.foreground }]}>{sub.utr}</Text>
                    </View>
                  ) : null}
                  {sub.adminNotes ? (
                    <View style={styles.paymentDetailRow}>
                      <Text style={[styles.paymentDetailLabel, { color: colors.mutedForeground }]}>Note</Text>
                      <Text style={[styles.paymentDetailVal, { color: colors.mutedForeground }]}>{sub.adminNotes}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Screenshot thumbnail */}
                {sub.screenshotBase64 && (
                  <Pressable
                    onPress={() => {
                      setFullScreenshot(sub.screenshotBase64);
                      setScreenshotModalVisible(true);
                    }}
                    style={styles.screenshotThumbWrap}
                  >
                    <Image
                      source={{ uri: `data:image/jpeg;base64,${sub.screenshotBase64}` }}
                      style={styles.screenshotThumb}
                      resizeMode="cover"
                    />
                    <View style={styles.screenshotThumbOverlay}>
                      <Feather name="maximize-2" size={16} color="#fff" />
                      <Text style={styles.screenshotThumbLabel}>View Screenshot</Text>
                    </View>
                  </Pressable>
                )}

                {/* Actions for pending */}
                {sub.status === "pending" && (
                  <View style={[styles.paymentActions, { borderTopColor: colors.border }]}>
                    <Pressable
                      style={[styles.paymentActionBtn, { backgroundColor: `${EMERALD}12` }]}
                      onPress={() => openVerifyModal(sub)}
                    >
                      <Feather name="check-circle" size={16} color={EMERALD} />
                      <Text style={[styles.paymentActionText, { color: EMERALD }]}>Verify & Approve</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.paymentActionBtn, { backgroundColor: `${RED}12` }]}
                      onPress={() => {
                        setVerifyingSub(sub);
                        setShowRejectNotes(true);
                        setRejectNotesInput("");
                        setVerifyModal(true);
                        setApprovedAmountInput(String(sub.claimedAmount));
                      }}
                    >
                      <Feather name="x-circle" size={16} color={RED} />
                      <Text style={[styles.paymentActionText, { color: RED }]}>Reject</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ══ SETTINGS ══ */}
      {activeSection === "settings" && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
          refreshControl={REFRESH}
        >
          {/* ── UPI Payment Settings ── */}
          <View style={[styles.settingCard, { backgroundColor: colors.card }]}>
            <View style={styles.upiSettingHeader}>
              <View style={[styles.upiSettingIcon, { backgroundColor: "#7C3AED15" }]}>
                <Feather name="send" size={18} color="#7C3AED" />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: colors.foreground }]}>UPI Payment Settings</Text>
                <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>
                  Members will use this to pay their bills
                </Text>
              </View>
            </View>

            {/* UPI ID */}
            <View style={styles.upiFormGroup}>
              <Text style={[styles.upiFormLabel, { color: colors.mutedForeground }]}>UPI ID *</Text>
              <TextInput
                style={[styles.upiFormInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                value={upiForm.upiId}
                onChangeText={(v) => setUpiForm((f) => ({ ...f, upiId: v }))}
                placeholder="e.g. dishari@upi"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
              />
            </View>

            {/* Account Holder Name */}
            <View style={styles.upiFormGroup}>
              <Text style={[styles.upiFormLabel, { color: colors.mutedForeground }]}>Account Holder Name *</Text>
              <TextInput
                style={[styles.upiFormInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                value={upiForm.accountHolderName}
                onChangeText={(v) => setUpiForm((f) => ({ ...f, accountHolderName: v }))}
                placeholder="e.g. Dishari Mess Admin"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            {/* Payment Note */}
            <View style={styles.upiFormGroup}>
              <Text style={[styles.upiFormLabel, { color: colors.mutedForeground }]}>Payment Note (optional)</Text>
              <TextInput
                style={[styles.upiFormInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                value={upiForm.paymentNote}
                onChangeText={(v) => setUpiForm((f) => ({ ...f, paymentNote: v }))}
                placeholder="e.g. Mess bill — Jul 2026"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            {/* QR Code */}
            <View style={styles.upiFormGroup}>
              <Text style={[styles.upiFormLabel, { color: colors.mutedForeground }]}>QR Code (optional)</Text>
              {upiQrBase64 ? (
                <View style={styles.qrPreviewWrap}>
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${upiQrBase64}` }}
                    style={styles.qrPreview}
                    resizeMode="contain"
                  />
                  <View style={styles.qrPreviewActions}>
                    <Pressable
                      style={[styles.qrChangeBtn, { backgroundColor: `${PRIMARY}12`, borderColor: `${PRIMARY}25` }]}
                      onPress={pickQrCode}
                    >
                      <Feather name="refresh-cw" size={14} color={PRIMARY} />
                      <Text style={[styles.qrChangeBtnText, { color: PRIMARY }]}>Change</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.qrChangeBtn, { backgroundColor: `${RED}12`, borderColor: `${RED}25` }]}
                      onPress={() => setUpiQrBase64(null)}
                    >
                      <Feather name="trash-2" size={14} color={RED} />
                      <Text style={[styles.qrChangeBtnText, { color: RED }]}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={[styles.qrPickerBtn, { borderColor: colors.border, backgroundColor: colors.muted }]}
                  onPress={pickQrCode}
                >
                  <Feather name="image" size={22} color={colors.mutedForeground} />
                  <Text style={[styles.qrPickerText, { color: colors.mutedForeground }]}>
                    Upload QR Code Image
                  </Text>
                </Pressable>
              )}
            </View>

            <Pressable
              style={({ pressed }) => [{ opacity: (pressed || isSavingUpi) ? 0.75 : 1, marginTop: 4 }]}
              onPress={saveUpi}
              disabled={isSavingUpi}
            >
              <LinearGradient colors={["#7C3AED", PRIMARY]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addBtn}>
                {isSavingUpi ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="save" size={16} color="#fff" />
                )}
                <Text style={styles.addBtnText}>
                  {isSavingUpi ? "Saving…" : "Save UPI Settings"}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>

          <View style={[styles.settingCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.settingTitle, { color: colors.foreground }]}>Cook Salary</Text>
            <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>Fixed amount charged per member per month</Text>
            <View style={styles.settingInputRow}>
              <Text style={[styles.settingVal, { color: colors.foreground }]}>
                ₹{settings.cookSalary}{" "}
                <Text style={{ fontSize: 14, fontWeight: "400", color: colors.mutedForeground }}>/ member</Text>
              </Text>
              <Pressable
                style={[styles.smallBtn, { backgroundColor: "#4F46E518" }]}
                onPress={() => openEditModal({
                  title: "Cook Salary",
                  subtitle: "Enter amount per member (₹)",
                  value: String(settings.cookSalary),
                  onSave: async (v) => {
                    const p = parseFloat(v);
                    if (isNaN(p) || p < 0) throw new Error("Please enter a valid number (0 or above).");
                    await updateSettings({ cookSalary: p });
                  },
                })}
              >
                <Feather name="edit-2" size={14} color={PRIMARY} />
                <Text style={[styles.smallBtnText, { color: PRIMARY }]}>Edit</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.settingCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.settingTitle, { color: colors.foreground }]}>Egg Price</Text>
            <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>Current price per egg</Text>
            <View style={styles.settingInputRow}>
              <Text style={[styles.settingVal, { color: colors.foreground }]}>
                ₹{settings.eggPrice}{" "}
                <Text style={{ fontSize: 14, fontWeight: "400", color: colors.mutedForeground }}>/ egg</Text>
              </Text>
              <Pressable
                style={[styles.smallBtn, { backgroundColor: "#4F46E518" }]}
                onPress={() => openEditModal({
                  title: "Egg Price",
                  subtitle: "Enter price per egg (₹)",
                  value: String(settings.eggPrice),
                  onSave: async (v) => {
                    const p = parseFloat(v);
                    if (isNaN(p) || p <= 0) throw new Error("Please enter a valid positive number.");
                    await updateSettings({ eggPrice: p });
                  },
                })}
              >
                <Feather name="edit-2" size={14} color={PRIMARY} />
                <Text style={[styles.smallBtnText, { color: PRIMARY }]}>Edit</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.settingCard, { backgroundColor: "rgba(79,70,229,0.08)", borderWidth: 1.5, borderColor: "rgba(79,70,229,0.25)" }]}>
            <Text style={[styles.settingTitle, { color: PRIMARY }]}>Admin Login</Text>
            <Text style={[styles.settingDesc, { color: PRIMARY }]}>
              Login ID: <Text style={{ fontWeight: "700" }}>admin</Text>
            </Text>
            <Text style={[styles.settingDesc, { color: "#7C3AED", marginTop: 4 }]}>
              Members log in using their phone number and the password set for them.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* ══ ANNOUNCE ══ */}
      {activeSection === "announce" && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
          refreshControl={REFRESH}
        >
          <Pressable
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginBottom: 20 }]}
            onPress={() => { setAnnForm({ title: "", body: "" }); setAnnModal(true); }}
          >
            <LinearGradient colors={[PRIMARY, "#7C3AED"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addBtn}>
              <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Post Announcement</Text>
            </LinearGradient>
          </Pressable>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>All Announcements</Text>
          {announcements.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No announcements yet</Text>
          ) : announcements.map((a) => (
            <View key={a.id} style={[styles.annCard, { backgroundColor: colors.card }]}>
              <View style={styles.annCardTop}>
                <View style={[styles.annIconWrap, { backgroundColor: "#4F46E518" }]}>
                  <Feather name="bell" size={16} color={PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.annTitle, { color: colors.foreground }]}>{a.title}</Text>
                  <Text style={[styles.annDate, { color: colors.mutedForeground }]}>
                    {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    Alert.alert("Delete", `Remove "${a.title}"?`, [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete", style: "destructive",
                        onPress: async () => {
                          try { await deleteAnnouncement(a.id); }
                          catch (err) { Alert.alert("Delete Failed", (err as Error).message || "Could not delete."); }
                        },
                      },
                    ])
                  }
                  style={{ padding: 6 }}
                >
                  <Feather name="trash-2" size={18} color={colors.destructive} />
                </Pressable>
              </View>
              <Text style={[styles.annBody, { color: colors.mutedForeground }]}>{a.body}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ══ Egg Modal ══ */}
      <Modal visible={eggModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Egg Entry</Text>
              <Pressable onPress={() => setEggModal(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>MEMBER</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {activeMembers.map((m) => (
                  <Pressable
                    key={m.id}
                    style={[styles.memberChip, { backgroundColor: eggForm.memberId === m.id ? PRIMARY : colors.muted }]}
                    onPress={() => setEggForm((f) => ({ ...f, memberId: m.id }))}
                  >
                    <Text style={{ color: eggForm.memberId === m.id ? "#fff" : colors.mutedForeground, fontWeight: "600", fontSize: 13 }}>
                      {m.name.split(" ")[0]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>DATE</Text>
              <TextInput
                style={[styles.formInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                value={eggForm.date}
                onChangeText={(v) => setEggForm((f) => ({ ...f, date: v }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>NUMBER OF EGGS</Text>
              <TextInput
                style={[styles.formInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                value={eggForm.count}
                onChangeText={(v) => setEggForm((f) => ({ ...f, count: v }))}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
              />
            </View>
            <Pressable
              style={({ pressed }) => [{ opacity: (pressed || isSavingEgg) ? 0.7 : 1, marginTop: 8, marginBottom: 20 }]}
              onPress={saveEgg}
              disabled={isSavingEgg}
            >
              <LinearGradient colors={[PRIMARY, "#7C3AED"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>{isSavingEgg ? "Saving…" : "Save Egg Entry"}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ══ Advance Modal ══ */}
      <Modal visible={advModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Advance</Text>
              <Pressable onPress={() => setAdvModal(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>MEMBER</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {activeMembers.map((m) => (
                  <Pressable
                    key={m.id}
                    style={[styles.memberChip, { backgroundColor: advForm.memberId === m.id ? PRIMARY : colors.muted }]}
                    onPress={() => setAdvForm((f) => ({ ...f, memberId: m.id }))}
                  >
                    <Text style={{ color: advForm.memberId === m.id ? "#fff" : colors.mutedForeground, fontWeight: "600", fontSize: 13 }}>
                      {m.name.split(" ")[0]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            {[
              { label: "AMOUNT (₹)", key: "amount", numeric: true },
              { label: "DATE",       key: "date" },
              { label: "PAYMENT METHOD", key: "method" },
              { label: "NOTES",      key: "notes" },
            ].map(({ label, key, numeric }) => (
              <View key={key} style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                  value={String((advForm as Record<string, unknown>)[key] ?? "")}
                  onChangeText={(v) => setAdvForm((f) => ({ ...f, [key]: v }))}
                  keyboardType={numeric ? "numeric" : "default"}
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            ))}
            <Pressable
              style={({ pressed }) => [{ opacity: (pressed || isSavingAdv) ? 0.7 : 1, marginTop: 8, marginBottom: 20 }]}
              onPress={saveAdv}
              disabled={isSavingAdv}
            >
              <LinearGradient colors={[PRIMARY, "#7C3AED"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>{isSavingAdv ? "Saving…" : "Add Advance"}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ══ Fine Modal (Add / Edit) ══ */}
      <Modal visible={fineModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView
            style={{ width: "100%" }}
            contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {editingFine ? "Edit Fine" : "Add Fine"}
                </Text>
                <Pressable onPress={() => { setFineModal(false); setEditingFine(null); }}>
                  <Feather name="x" size={22} color={colors.mutedForeground} />
                </Pressable>
              </View>

              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>MEMBER</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {activeMembers.map((m) => (
                    <Pressable
                      key={m.id}
                      style={[styles.memberChip, { backgroundColor: fineForm.memberId === m.id ? "#DC2626" : colors.muted }]}
                      onPress={() => setFineForm((f) => ({ ...f, memberId: m.id }))}
                    >
                      <Text style={{ color: fineForm.memberId === m.id ? "#fff" : colors.mutedForeground, fontWeight: "600", fontSize: 13 }}>
                        {m.name.split(" ")[0]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              {[
                { label: "AMOUNT (₹)",     key: "amount", numeric: true,  placeholder: "0" },
                { label: "DATE",            key: "date",   numeric: false, placeholder: "YYYY-MM-DD" },
                { label: "REASON",          key: "reason", numeric: false, placeholder: "e.g. Not enough meals" },
                { label: "NOTES (OPTIONAL)",key: "notes",  numeric: false, placeholder: "Any additional details" },
              ].map(({ label, key, numeric, placeholder }) => (
                <View key={key} style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                    value={String((fineForm as Record<string, unknown>)[key] ?? "")}
                    onChangeText={(v) => setFineForm((f) => ({ ...f, [key]: v }))}
                    keyboardType={numeric ? "numeric" : "default"}
                    placeholder={placeholder}
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
              ))}

              <Pressable
                style={({ pressed }) => [{ opacity: (pressed || isSavingFine) ? 0.7 : 1, marginTop: 8, marginBottom: 20 }]}
                onPress={saveFine}
                disabled={isSavingFine}
              >
                <LinearGradient colors={["#DC2626", "#B91C1C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>
                    {isSavingFine ? "Saving…" : editingFine ? "Save Changes" : "Add Fine"}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ══ Announcement Modal ══ */}
      <Modal visible={annModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Post Announcement</Text>
              <Pressable onPress={() => setAnnModal(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>TITLE</Text>
              <TextInput
                style={[styles.formInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                value={annForm.title}
                onChangeText={(v) => setAnnForm((f) => ({ ...f, title: v }))}
                placeholder="e.g. Mess closed on Sunday"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>MESSAGE</Text>
              <TextInput
                style={[styles.formInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border, minHeight: 100, textAlignVertical: "top" }]}
                value={annForm.body}
                onChangeText={(v) => setAnnForm((f) => ({ ...f, body: v }))}
                placeholder="Write your announcement here…"
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={4}
              />
            </View>
            <Pressable
              style={({ pressed }) => [{ opacity: (pressed || isSavingAnn) ? 0.7 : 1, marginTop: 4, marginBottom: 20 }]}
              onPress={saveAnnouncement}
              disabled={isSavingAnn}
            >
              <LinearGradient colors={[PRIMARY, "#7C3AED"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>{isSavingAnn ? "Posting…" : "Post Announcement"}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ══ Payment Verify / Reject Modal ══ */}
      <Modal visible={verifyModal} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <ScrollView
            style={{ width: "100%" }}
            contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                    {showRejectNotes ? "Reject Payment" : "Verify Payment"}
                  </Text>
                  {verifyingSub && (
                    <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                      {getMemberName(verifyingSub.memberId)} · {monthLabel(verifyingSub.month)}
                    </Text>
                  )}
                </View>
                <Pressable onPress={() => { setVerifyModal(false); setShowRejectNotes(false); }} hitSlop={10}>
                  <Feather name="x" size={22} color={colors.mutedForeground} />
                </Pressable>
              </View>

              {verifyingSub && (
                <>
                  {/* Screenshot in modal */}
                  {verifyingSub.screenshotBase64 && (
                    <Pressable
                      onPress={() => {
                        setFullScreenshot(verifyingSub.screenshotBase64);
                        setScreenshotModalVisible(true);
                      }}
                      style={styles.verifyScreenshotWrap}
                    >
                      <Image
                        source={{ uri: `data:image/jpeg;base64,${verifyingSub.screenshotBase64}` }}
                        style={styles.verifyScreenshot}
                        resizeMode="cover"
                      />
                      <View style={styles.screenshotThumbOverlay}>
                        <Feather name="maximize-2" size={14} color="#fff" />
                        <Text style={styles.screenshotThumbLabel}>View Full</Text>
                      </View>
                    </Pressable>
                  )}

                  {/* Details */}
                  <View style={[styles.verifyDetailsCard, { backgroundColor: colors.muted }]}>
                    <View style={styles.verifyDetailRow}>
                      <Text style={[styles.paymentDetailLabel, { color: colors.mutedForeground }]}>Member</Text>
                      <Text style={[styles.paymentDetailVal, { color: colors.foreground }]}>{getMemberName(verifyingSub.memberId)}</Text>
                    </View>
                    <View style={styles.verifyDetailRow}>
                      <Text style={[styles.paymentDetailLabel, { color: colors.mutedForeground }]}>Claimed Amount</Text>
                      <Text style={[styles.paymentDetailVal, { color: colors.foreground }]}>₹{verifyingSub.claimedAmount.toFixed(2)}</Text>
                    </View>
                    {verifyingSub.utr && (
                      <View style={styles.verifyDetailRow}>
                        <Text style={[styles.paymentDetailLabel, { color: colors.mutedForeground }]}>UTR / Txn ID</Text>
                        <Text style={[styles.paymentDetailVal, { color: colors.foreground }]}>{verifyingSub.utr}</Text>
                      </View>
                    )}
                  </View>

                  {!showRejectNotes ? (
                    <>
                      {/* Approved Amount */}
                      <View style={styles.formGroup}>
                        <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>APPROVED AMOUNT (₹)</Text>
                        <TextInput
                          style={[styles.verifyAmountInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                          value={approvedAmountInput}
                          onChangeText={setApprovedAmountInput}
                          keyboardType="decimal-pad"
                          placeholder={String(verifyingSub.claimedAmount)}
                          placeholderTextColor={colors.mutedForeground}
                          autoFocus
                        />
                        {/* Partial / Full tag */}
                        {approvedAmountInput !== "" && !isNaN(parseFloat(approvedAmountInput)) && (
                          <View style={[styles.amountHint, {
                            backgroundColor: parseFloat(approvedAmountInput) < verifyingSub.claimedAmount
                              ? `${ORANGE}15` : `${EMERALD}15`,
                          }]}>
                            <Text style={{
                              fontSize: 12, fontWeight: "600",
                              color: parseFloat(approvedAmountInput) < verifyingSub.claimedAmount ? ORANGE : EMERALD,
                            }}>
                              {parseFloat(approvedAmountInput) < verifyingSub.claimedAmount
                                ? `Partial Payment — ₹${(verifyingSub.claimedAmount - parseFloat(approvedAmountInput)).toFixed(2)} less than claimed`
                                : "Full claimed amount approved"}
                            </Text>
                          </View>
                        )}
                      </View>

                      <Pressable
                        style={({ pressed }) => [{ opacity: (pressed || isProcessing) ? 0.75 : 1, marginBottom: 12 }]}
                        onPress={handleApprove}
                        disabled={isProcessing}
                      >
                        <LinearGradient colors={[EMERALD, "#10B981"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
                          {isProcessing ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="check" size={18} color="#fff" />}
                          <Text style={styles.saveBtnText}>{isProcessing ? "Approving…" : "Confirm Approval"}</Text>
                        </LinearGradient>
                      </Pressable>

                      <Pressable
                        style={[styles.rejectOutlineBtn, { borderColor: RED }]}
                        onPress={() => setShowRejectNotes(true)}
                      >
                        <Feather name="x-circle" size={16} color={RED} />
                        <Text style={[styles.rejectOutlineBtnText, { color: RED }]}>Reject Instead</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      {/* Reject Notes */}
                      <View style={styles.formGroup}>
                        <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>REJECTION REASON (OPTIONAL)</Text>
                        <TextInput
                          style={[styles.formInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border, minHeight: 80, textAlignVertical: "top" }]}
                          value={rejectNotesInput}
                          onChangeText={setRejectNotesInput}
                          placeholder="e.g. UTR not matching, please resubmit"
                          placeholderTextColor={colors.mutedForeground}
                          multiline
                          numberOfLines={3}
                          autoFocus
                        />
                      </View>

                      <Pressable
                        style={({ pressed }) => [{ opacity: (pressed || isProcessing) ? 0.75 : 1, marginBottom: 12 }]}
                        onPress={handleReject}
                        disabled={isProcessing}
                      >
                        <LinearGradient colors={[RED, "#E11D48"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
                          {isProcessing ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="x" size={18} color="#fff" />}
                          <Text style={styles.saveBtnText}>{isProcessing ? "Rejecting…" : "Confirm Rejection"}</Text>
                        </LinearGradient>
                      </Pressable>

                      <Pressable
                        style={[styles.rejectOutlineBtn, { borderColor: colors.border, marginBottom: 20 }]}
                        onPress={() => setShowRejectNotes(false)}
                      >
                        <Text style={[styles.rejectOutlineBtnText, { color: colors.mutedForeground }]}>Back to Approval</Text>
                      </Pressable>
                    </>
                  )}
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ══ Full-screen Screenshot Modal ══ */}
      <Modal visible={screenshotModalVisible} animationType="fade" transparent statusBarTranslucent>
        <View style={styles.screenshotFullOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setScreenshotModalVisible(false)} />
          {fullScreenshot && (
            <Image
              source={{ uri: `data:image/jpeg;base64,${fullScreenshot}` }}
              style={styles.screenshotFull}
              resizeMode="contain"
            />
          )}
          <Pressable
            style={styles.screenshotFullClose}
            onPress={() => setScreenshotModalVisible(false)}
          >
            <Feather name="x" size={22} color="#fff" />
          </Pressable>
        </View>
      </Modal>

      {/* ══ Inline numeric edit modal ══ */}
      <Modal visible={editModal.visible} animationType="fade" transparent statusBarTranslucent>
        <KeyboardAvoidingView style={styles.editOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeEditModal} />
          <View style={[styles.editSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.editTitle, { color: colors.foreground }]}>{editModal.title}</Text>
            <Text style={[styles.editSubtitle, { color: colors.mutedForeground }]}>{editModal.subtitle}</Text>
            <TextInput
              style={[styles.editInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
              value={editInputVal}
              onChangeText={setEditInputVal}
              keyboardType="numeric"
              autoFocus
              selectTextOnFocus
              placeholderTextColor={colors.mutedForeground}
            />
            <View style={styles.editActions}>
              <Pressable style={[styles.editCancelBtn, { borderColor: colors.border }]} onPress={closeEditModal}>
                <Text style={[styles.editCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.editSaveBtnWrapper, { opacity: pressed ? 0.85 : 1 }]} onPress={confirmEdit}>
                <LinearGradient colors={[PRIMARY, "#7C3AED"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.editSaveBtn}>
                  <Text style={styles.editSaveText}>Save</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // ── Shortcut tab bar ──
  tabRow: { flexDirection: "row", gap: 2, paddingHorizontal: 2 },
  tabTouchable: { minWidth: 52 },
  tabInner: {
    alignItems: "center", paddingVertical: 7, gap: 3, borderRadius: 10,
    paddingHorizontal: 6,
  },
  tabLabel: { fontSize: 10, fontWeight: "700", color: INACTIVE_FG },
  tabBadge: {
    position: "absolute", top: -4, right: -8,
    backgroundColor: RED, borderRadius: 8,
    minWidth: 14, height: 14, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 2,
  },
  tabBadgeText: { color: "#fff", fontSize: 8, fontWeight: "800" },

  // ── Month navigator ──
  monthNavWrapper: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  monthNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderRadius: 16, padding: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.6)",
    shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10, shadowRadius: 14, elevation: 4,
  },
  navArrow: { padding: 8 },
  monthText: { fontSize: 17, fontWeight: "700" },

  // ── Price / info cards ──
  priceCard: {
    borderRadius: 20, padding: 18, marginBottom: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.6)",
    shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 16, elevation: 6,
  },
  priceLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceVal: { fontSize: 24, fontWeight: "700" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, paddingVertical: 16 },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 14 },
  emptyText: { textAlign: "center", paddingVertical: 20, fontSize: 14 },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },

  // ── List items ──
  listItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.6)",
    shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "700" },
  itemDate: { fontSize: 12, marginTop: 4 },
  itemAmount: { fontSize: 16, fontWeight: "700" },
  itemAmountSub: { fontSize: 13, marginTop: 2 },

  // ── Fine-specific ──
  fineSummary: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1,
  },
  fineSummaryText: { fontSize: 13, fontWeight: "700" },
  fineCard: {
    borderRadius: 18, marginBottom: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.6)",
    shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
    overflow: "hidden",
  },
  fineCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 },
  fineAmountBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, alignSelf: "flex-start" },
  fineAmountText: { fontSize: 15, fontWeight: "800", color: "#DC2626" },
  fineActions: { flexDirection: "row", borderTopWidth: 1, overflow: "hidden" },
  fineActionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10,
  },
  fineActionText: { fontSize: 13, fontWeight: "600" },
  fineActionDivider: { width: 1, marginVertical: 8 },

  // ── Report card ──
  reportCard: {
    borderRadius: 20, padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.6)",
    shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 16, elevation: 6,
  },
  reportHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  reportName: { flex: 1, fontSize: 16, fontWeight: "700" },
  dueBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  dueText: { fontSize: 12, fontWeight: "700" },
  divider: { height: 1, marginBottom: 8 },
  reportRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  reportKey: { fontSize: 14 },
  reportVal: { fontSize: 14, fontWeight: "600" },

  // ── Payment cards ──
  paymentSummaryCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14,
  },
  paymentSummaryText: { fontSize: 14, fontWeight: "700" },
  filterRow: { flexDirection: "row", gap: 8 },
  filterChip: {
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1, borderColor: "rgba(148,163,184,0.22)",
  },
  filterChipText: { fontSize: 13, fontWeight: "600" },
  paymentCard: {
    borderRadius: 20, marginBottom: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.6)",
    shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 16, elevation: 6,
    overflow: "hidden",
  },
  paymentCardHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, paddingBottom: 12 },
  paymentCardInfo: { flex: 1 },
  paymentCardName: { fontSize: 16, fontWeight: "700" },
  paymentCardMonth: { fontSize: 12, marginTop: 2 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  paymentCardDivider: { height: 1, marginHorizontal: 16 },
  paymentDetails: { paddingHorizontal: 16, paddingVertical: 10 },
  paymentDetailRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 5,
  },
  paymentDetailLabel: { fontSize: 13 },
  paymentDetailVal: { fontSize: 14, fontWeight: "600" },
  screenshotThumbWrap: { marginHorizontal: 16, marginBottom: 12, borderRadius: 10, overflow: "hidden" },
  screenshotThumb: { width: "100%", height: 140 },
  screenshotThumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.30)",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
  },
  screenshotThumbLabel: { color: "#fff", fontSize: 13, fontWeight: "600" },
  paymentActions: {
    flexDirection: "row", borderTopWidth: 1, gap: 0,
  },
  paymentActionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 13,
  },
  paymentActionText: { fontSize: 13, fontWeight: "700" },

  // ── Setting card ──
  settingCard: {
    borderRadius: 20, padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.6)",
    shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 16, elevation: 6,
  },
  settingTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  settingDesc: { fontSize: 13 },
  settingInputRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  settingVal: { fontSize: 20, fontWeight: "700" },
  smallBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  smallBtnText: { fontSize: 13, fontWeight: "700" },

  // ── UPI Settings form ──
  upiSettingHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 18 },
  upiSettingIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 2 },
  upiFormGroup: { marginBottom: 14 },
  upiFormLabel: { fontSize: 11, fontWeight: "700", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  upiFormInput: {
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
  qrPickerBtn: {
    borderWidth: 1.5, borderRadius: 12, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
    paddingVertical: 24, gap: 8,
  },
  qrPickerText: { fontSize: 14 },
  qrPreviewWrap: { alignItems: "center" },
  qrPreview: { width: 160, height: 160, borderRadius: 12, marginBottom: 10 },
  qrPreviewActions: { flexDirection: "row", gap: 10 },
  qrChangeBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8,
  },
  qrChangeBtnText: { fontSize: 13, fontWeight: "600" },

  // ── Announcement cards ──
  annCard: {
    borderRadius: 20, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.6)",
    shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 16, elevation: 6,
  },
  annCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  annIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  annTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  annDate: { fontSize: 12 },
  annBody: { fontSize: 14, lineHeight: 20 },

  // ── Verify modal ──
  verifyScreenshotWrap: {
    borderRadius: 14, overflow: "hidden", marginBottom: 14, height: 160,
  },
  verifyScreenshot: { width: "100%", height: "100%" },
  verifyDetailsCard: {
    borderRadius: 14, padding: 14, marginBottom: 16, gap: 6,
  },
  verifyDetailRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 4,
  },
  verifyAmountInput: {
    borderWidth: 2, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 28, fontWeight: "700", textAlign: "center",
    marginBottom: 10,
  },
  amountHint: {
    borderRadius: 10, padding: 10, marginBottom: 16,
  },
  rejectOutlineBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, borderWidth: 1.5, paddingVertical: 13, marginBottom: 20,
  },
  rejectOutlineBtnText: { fontSize: 14, fontWeight: "600" },
  modalSubtitle: { fontSize: 13, marginTop: 2 },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(148,163,184,0.4)",
    alignSelf: "center", marginBottom: 16,
  },

  // ── Modals ──
  modalOverlay: { flex: 1, backgroundColor: "#00000060", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingTop: 12, maxHeight: "92%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 12, fontWeight: "600", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  formInput: {
    borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 16,
  },
  memberChip: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  saveBtn: { borderRadius: 16, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // ── Full-screen screenshot ──
  screenshotFullOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center", justifyContent: "center",
  },
  screenshotFull: { width: "90%", height: "80%" },
  screenshotFullClose: {
    position: "absolute", top: 56, right: 20,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },

  // ── Inline edit modal ──
  editOverlay: { flex: 1, backgroundColor: "#00000070", justifyContent: "center", alignItems: "center" },
  editSheet: {
    width: "85%", borderRadius: 24, padding: 24,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  editTitle: { fontSize: 20, fontWeight: "800", marginBottom: 6 },
  editSubtitle: { fontSize: 14, marginBottom: 20 },
  editInput: {
    borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 24, fontWeight: "700", textAlign: "center", marginBottom: 24,
  },
  editActions: { flexDirection: "row", gap: 12 },
  editCancelBtn: { flex: 1, borderWidth: 1.5, borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  editCancelText: { fontSize: 15, fontWeight: "600" },
  editSaveBtnWrapper: { flex: 1, borderRadius: 16, overflow: "hidden" },
  editSaveBtn: { flex: 1, paddingVertical: 14, alignItems: "center" },
  editSaveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
