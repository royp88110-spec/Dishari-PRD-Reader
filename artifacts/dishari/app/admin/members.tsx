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

import { Member, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

const EMPTY: Omit<Member, "id"> = {
  name: "", phone: "", email: "", roomNumber: "",
  joinDate: new Date().toISOString().slice(0, 10),
  status: "active", password: "",
};

export default function MembersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { members, addMember, updateMember, deleteMember } = useData();
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState<Omit<Member, "id">>(EMPTY);

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search)
  );

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalVisible(true);
  };

  const openEdit = (m: Member) => {
    setEditing(m);
    setForm({ name: m.name, phone: m.phone, email: m.email ?? "", roomNumber: m.roomNumber ?? "", joinDate: m.joinDate, status: m.status, password: m.password });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.password.trim()) {
      Alert.alert("Error", "Name, Phone, and Password are required.");
      return;
    }
    if (editing) {
      await updateMember(editing.id, form);
    } else {
      await addMember(form);
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
  };

  const handleDelete = (m: Member) => {
    Alert.alert("Delete Member", `Delete ${m.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await deleteMember(m.id);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const toggleStatus = async (m: Member) => {
    await updateMember(m.id, { status: m.status === "active" ? "inactive" : "active" });
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border, marginTop: Platform.OS === "web" ? 67 : 12 }]}>
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search members..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingHorizontal: 16 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={40} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No members found</Text>
          </View>
        }
        renderItem={({ item: m }) => (
          <View style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: m.status === "active" ? "#D4500A20" : colors.muted }]}>
              <Text style={[styles.avatarText, { color: m.status === "active" ? "#D4500A" : colors.mutedForeground }]}>
                {m.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <View style={styles.memberNameRow}>
                <Text style={[styles.memberName, { color: colors.foreground }]}>{m.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: m.status === "active" ? "#16A34A20" : "#DC262620" }]}>
                  <Text style={[styles.statusText, { color: m.status === "active" ? "#16A34A" : "#DC2626" }]}>
                    {m.status}
                  </Text>
                </View>
              </View>
              <Text style={[styles.memberPhone, { color: colors.mutedForeground }]}>
                {m.phone}{m.roomNumber ? ` · Room ${m.roomNumber}` : ""}
              </Text>
              <Text style={[styles.memberJoin, { color: colors.mutedForeground }]}>Joined: {m.joinDate}</Text>
            </View>
            <View style={styles.actions}>
              <Pressable onPress={() => toggleStatus(m)} style={styles.actionBtn}>
                <Feather name={m.status === "active" ? "toggle-right" : "toggle-left"} size={20} color={colors.primary} />
              </Pressable>
              <Pressable onPress={() => openEdit(m)} style={styles.actionBtn}>
                <Feather name="edit-2" size={18} color={colors.primary} />
              </Pressable>
              <Pressable onPress={() => handleDelete(m)} style={styles.actionBtn}>
                <Feather name="trash-2" size={18} color={colors.destructive} />
              </Pressable>
            </View>
          </View>
        )}
      />

      <Pressable
        style={[styles.fab, { backgroundColor: "#D4500A" }]}
        onPress={openAdd}
      >
        <Feather name="user-plus" size={24} color="#fff" />
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editing ? "Edit Member" : "Add Member"}
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { label: "Full Name *", key: "name", placeholder: "e.g. Rahul Ahmed" },
                { label: "Phone *", key: "phone", placeholder: "e.g. 01711111111", keyboard: "phone-pad" },
                { label: "Email", key: "email", placeholder: "optional", keyboard: "email-address" },
                { label: "Room Number", key: "roomNumber", placeholder: "e.g. 101" },
                { label: "Joining Date *", key: "joinDate", placeholder: "YYYY-MM-DD" },
                { label: "Password *", key: "password", placeholder: "Login password" },
              ].map(({ label, key, placeholder, keyboard }) => (
                <View key={key} style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <TextInput
                    style={[styles.formInput, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    value={String((form as Record<string, unknown>)[key] ?? "")}
                    onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                    keyboardType={(keyboard as "default") ?? "default"}
                    autoCapitalize="none"
                  />
                </View>
              ))}

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>Status</Text>
                <View style={styles.statusRow}>
                  {(["active", "inactive"] as const).map((s) => (
                    <Pressable
                      key={s}
                      style={[styles.statusOpt, { borderColor: form.status === s ? "#D4500A" : colors.border, backgroundColor: form.status === s ? "#D4500A20" : colors.muted }]}
                      onPress={() => setForm((f) => ({ ...f, status: s }))}
                    >
                      <Text style={[styles.statusOptText, { color: form.status === s ? "#D4500A" : colors.mutedForeground }]}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Pressable
                style={[styles.saveBtn, { backgroundColor: "#D4500A" }]}
                onPress={handleSave}
              >
                <Text style={styles.saveBtnText}>{editing ? "Update Member" : "Add Member"}</Text>
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
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, marginBottom: 12, borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 16 },
  memberCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700" },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  memberName: { fontSize: 15, fontWeight: "700" },
  statusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: "600" },
  memberPhone: { fontSize: 13, marginTop: 2 },
  memberJoin: { fontSize: 11, marginTop: 2 },
  actions: { flexDirection: "row", gap: 4 },
  actionBtn: { padding: 8 },
  fab: {
    position: "absolute", right: 20, bottom: 100,
    width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#D4500A", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "#00000060", justifyContent: "flex-end" },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: "90%",
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  formGroup: { marginBottom: 14 },
  formLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  formInput: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 16,
  },
  statusRow: { flexDirection: "row", gap: 10 },
  statusOpt: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  statusOptText: { fontSize: 14, fontWeight: "600" },
  saveBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8, marginBottom: 20 },
  saveBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
