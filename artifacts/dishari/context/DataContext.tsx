import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { isSupabaseConfigured } from "@/lib/supabase";

export interface Member {
  id: string;
  name: string;
  phone: string;
  email?: string;
  joinDate: string;
  roomNumber?: string;
  status: "active" | "inactive";
  password: string;
}

export interface Meal {
  id: string;
  memberId: string;
  date: string;
  morning: boolean;
  night: boolean;
}

export interface Expense {
  id: string;
  type: "grocery" | "vegetable" | "fish" | "meat" | "gas" | "other";
  shopName?: string;
  date: string;
  items?: string;
  amount: number;
  notes?: string;
}

export interface Advance {
  id: string;
  memberId: string;
  amount: number;
  date: string;
  method: string;
  notes?: string;
}

export interface EggEntry {
  id: string;
  memberId: string;
  date: string;
  count: number;
}

export interface Settings {
  eggPrice: number;
  cookSalary: number;
}

export interface BillPayment {
  id: string;
  memberId: string;
  month: string;       // "YYYY-MM"
  paid: boolean;
  paidAt: string | null;
  amount: number;
}

export interface MonthlyBill {
  memberId: string;
  memberName: string;
  mealCount: number;
  perMealCost: number;
  mealBill: number;
  eggCount: number;
  eggBill: number;
  cookShare: number;
  grossBill: number;
  totalAdvance: number;
  dueAmount: number;
  creditBalance: number;
}

interface DataContextType {
  members: Member[];
  meals: Meal[];
  expenses: Expense[];
  advances: Advance[];
  eggs: EggEntry[];
  settings: Settings;
  payments: BillPayment[];
  isLoaded: boolean;
  addMember: (m: Omit<Member, "id">) => Promise<void>;
  updateMember: (id: string, u: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  setMeal: (memberId: string, date: string, morning: boolean, night: boolean) => Promise<void>;
  addExpense: (e: Omit<Expense, "id">) => Promise<void>;
  updateExpense: (id: string, u: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addAdvance: (a: Omit<Advance, "id">) => Promise<void>;
  deleteAdvance: (id: string) => Promise<void>;
  setEggEntry: (memberId: string, date: string, count: number) => Promise<void>;
  updateSettings: (s: Partial<Settings>) => Promise<void>;
  markPaid: (memberId: string, month: string, amount: number) => Promise<void>;
  markUnpaid: (memberId: string, month: string) => Promise<void>;
  calculateMonthlyBill: (memberId: string, month: string) => MonthlyBill;
  calculateAllMonthlyBills: (month: string) => MonthlyBill[];
  getMonthTotals: (month: string) => { totalExpense: number; totalMeals: number; perMealCost: number };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const getApiBase = (): string =>
  Platform.OS === "web" ? "" : `https://${process.env.EXPO_PUBLIC_DOMAIN ?? ""}`;

const apiCall = async (method: string, path: string, body?: unknown): Promise<unknown> => {
  const { getSupabase } = await import("@/lib/supabase");
  const { data: { session } } = await getSupabase().auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${getApiBase()}/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<unknown>;
};

const sb = () => import("@/lib/supabase").then(({ getSupabase }) => getSupabase());

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [eggs, setEggs] = useState<EggEntry[]>([]);
  const [settings, setSettings] = useState<Settings>({ eggPrice: 12, cookSalary: 250 });
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchMembers = useCallback(async () => {
    const client = await sb();
    const { data } = await client.from("members").select("*").order("name");
    if (data) {
      setMembers(
        (data as Record<string, unknown>[]).map((m) => ({
          id: m.id as string,
          name: m.name as string,
          phone: m.phone as string,
          email: (m.email as string | undefined) ?? undefined,
          joinDate: m.join_date as string,
          roomNumber: (m.room_number as string | undefined) ?? undefined,
          status: m.status as "active" | "inactive",
          password: "",
        }))
      );
    }
  }, []);

  const fetchMeals = useCallback(async () => {
    const client = await sb();
    const { data } = await client.from("meals").select("*");
    if (data) {
      setMeals(
        (data as Record<string, unknown>[]).map((m) => ({
          id: m.id as string,
          memberId: m.member_id as string,
          date: m.date as string,
          morning: m.morning as boolean,
          night: m.night as boolean,
        }))
      );
    }
  }, []);

  const fetchExpenses = useCallback(async () => {
    const client = await sb();
    const { data } = await client.from("expenses").select("*").order("date", { ascending: false });
    if (data) {
      setExpenses(
        (data as Record<string, unknown>[]).map((e) => ({
          id: e.id as string,
          type: e.type as Expense["type"],
          shopName: (e.shop_name as string | undefined) ?? undefined,
          date: e.date as string,
          items: (e.items as string | undefined) ?? undefined,
          amount: Number(e.amount),
          notes: (e.notes as string | undefined) ?? undefined,
        }))
      );
    }
  }, []);

  const fetchAdvances = useCallback(async () => {
    const client = await sb();
    const { data } = await client.from("advances").select("*").order("date", { ascending: false });
    if (data) {
      setAdvances(
        (data as Record<string, unknown>[]).map((a) => ({
          id: a.id as string,
          memberId: a.member_id as string,
          amount: Number(a.amount),
          date: a.date as string,
          method: (a.method as string) || "Cash",
          notes: (a.notes as string | undefined) ?? undefined,
        }))
      );
    }
  }, []);

  const fetchEggs = useCallback(async () => {
    const client = await sb();
    const { data } = await client.from("eggs").select("*");
    if (data) {
      setEggs(
        (data as Record<string, unknown>[]).map((e) => ({
          id: e.id as string,
          memberId: e.member_id as string,
          date: e.date as string,
          count: e.count as number,
        }))
      );
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    const client = await sb();
    const { data } = await client.from("settings").select("*").eq("id", 1).single();
    if (data) {
      setSettings({
        eggPrice: Number((data as Record<string, unknown>).egg_price),
        cookSalary: Number((data as Record<string, unknown>).cook_salary),
      });
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    const client = await sb();
    const { data } = await client.from("bill_payments").select("*");
    if (data) {
      setPayments(
        (data as Record<string, unknown>[]).map((p) => ({
          id: p.id as string,
          memberId: p.member_id as string,
          month: p.month as string,
          paid: p.paid as boolean,
          paidAt: (p.paid_at as string | null) ?? null,
          amount: Number(p.amount),
        }))
      );
    }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([
      fetchMembers(),
      fetchMeals(),
      fetchExpenses(),
      fetchAdvances(),
      fetchEggs(),
      fetchSettings(),
      fetchPayments(),
    ]);
    setIsLoaded(true);
  }, [fetchMembers, fetchMeals, fetchExpenses, fetchAdvances, fetchEggs, fetchSettings, fetchPayments]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoaded(true);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    sb().then((client) => {
      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
        if (session) {
          void loadAll();
        } else {
          setMembers([]); setMeals([]); setExpenses([]);
          setAdvances([]); setEggs([]); setPayments([]);
          setSettings({ eggPrice: 12, cookSalary: 250 });
          setIsLoaded(false);
        }
      });
      unsubscribe = () => subscription.unsubscribe();

      client.auth.getSession().then(({ data: { session } }) => {
        if (session) void loadAll();
        else setIsLoaded(true);
      });
    });

    return () => { unsubscribe?.(); };
  }, [loadAll]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let channel: ReturnType<Awaited<ReturnType<typeof sb>>["channel"]> | null = null;

    sb().then((client) => {
      channel = client
        .channel("dishari-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () => { void fetchMembers(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "meals" }, () => { void fetchMeals(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => { void fetchExpenses(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "advances" }, () => { void fetchAdvances(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "eggs" }, () => { void fetchEggs(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, () => { void fetchSettings(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "bill_payments" }, () => { void fetchPayments(); })
        .subscribe();
    });

    return () => {
      sb().then((client) => { if (channel) void client.removeChannel(channel!); });
    };
  }, [fetchMembers, fetchMeals, fetchExpenses, fetchAdvances, fetchEggs, fetchSettings, fetchPayments]);

  const addMember = async (m: Omit<Member, "id">) => {
    await apiCall("POST", "/admin/members", {
      name: m.name, phone: m.phone, email: m.email,
      roomNumber: m.roomNumber, joinDate: m.joinDate,
      status: m.status, password: m.password,
    });
  };

  const updateMember = async (id: string, u: Partial<Member>) => {
    const { password, ...rest } = u;
    if (password !== undefined && password.trim()) {
      await apiCall("PATCH", `/admin/members/${id}/password`, { password });
    }
    const row: Record<string, unknown> = {};
    if (rest.name !== undefined) row.name = rest.name;
    if (rest.phone !== undefined) row.phone = rest.phone;
    if (rest.email !== undefined) row.email = rest.email;
    if (rest.roomNumber !== undefined) row.room_number = rest.roomNumber;
    if (rest.joinDate !== undefined) row.join_date = rest.joinDate;
    if (rest.status !== undefined) row.status = rest.status;
    if (Object.keys(row).length > 0) {
      const client = await sb();
      await client.from("members").update(row).eq("id", id);
    }
  };

  const deleteMember = async (id: string) => {
    await apiCall("DELETE", `/admin/members/${id}`);
  };

  const setMeal = async (memberId: string, date: string, morning: boolean, night: boolean) => {
    const client = await sb();
    await client.from("meals").upsert(
      { member_id: memberId, date, morning, night },
      { onConflict: "member_id,date" }
    );
  };

  const addExpense = async (e: Omit<Expense, "id">) => {
    const client = await sb();
    await client.from("expenses").insert({
      type: e.type, shop_name: e.shopName ?? null, date: e.date,
      items: e.items ?? null, amount: e.amount, notes: e.notes ?? null,
    });
  };

  const updateExpense = async (id: string, u: Partial<Expense>) => {
    const row: Record<string, unknown> = {};
    if (u.type !== undefined) row.type = u.type;
    if (u.shopName !== undefined) row.shop_name = u.shopName;
    if (u.date !== undefined) row.date = u.date;
    if (u.items !== undefined) row.items = u.items;
    if (u.amount !== undefined) row.amount = u.amount;
    if (u.notes !== undefined) row.notes = u.notes;
    const client = await sb();
    await client.from("expenses").update(row).eq("id", id);
  };

  const deleteExpense = async (id: string) => {
    const client = await sb();
    await client.from("expenses").delete().eq("id", id);
  };

  const addAdvance = async (a: Omit<Advance, "id">) => {
    const client = await sb();
    await client.from("advances").insert({
      member_id: a.memberId, amount: a.amount, date: a.date,
      method: a.method, notes: a.notes ?? null,
    });
  };

  const deleteAdvance = async (id: string) => {
    const client = await sb();
    await client.from("advances").delete().eq("id", id);
  };

  const setEggEntry = async (memberId: string, date: string, count: number) => {
    const client = await sb();
    if (count === 0) {
      await client.from("eggs").delete().match({ member_id: memberId, date });
    } else {
      await client.from("eggs").upsert(
        { member_id: memberId, date, count },
        { onConflict: "member_id,date" }
      );
    }
  };

  const updateSettings = async (s: Partial<Settings>) => {
    const next = { ...settings, ...s };
    setSettings(next);
    const client = await sb();
    await client.from("settings").upsert(
      { id: 1, egg_price: next.eggPrice, cook_salary: next.cookSalary },
      { onConflict: "id" }
    );
  };

  /**
   * Mark a member's bill as paid for a given month.
   * Upserts into bill_payments so it's idempotent.
   */
  const markPaid = async (memberId: string, month: string, amount: number) => {
    const client = await sb();
    await client.from("bill_payments").upsert(
      {
        member_id: memberId,
        month,
        paid: true,
        paid_at: new Date().toISOString(),
        amount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "member_id,month" }
    );
    // Optimistic local update
    setPayments((prev) => {
      const exists = prev.find((p) => p.memberId === memberId && p.month === month);
      const now = new Date().toISOString();
      if (exists) {
        return prev.map((p) =>
          p.memberId === memberId && p.month === month
            ? { ...p, paid: true, paidAt: now, amount }
            : p
        );
      }
      return [...prev, { id: "optimistic", memberId, month, paid: true, paidAt: now, amount }];
    });
  };

  /**
   * Mark a member's bill as unpaid for a given month.
   * Uses upsert so it is idempotent even if no prior row exists.
   */
  const markUnpaid = async (memberId: string, month: string) => {
    const client = await sb();
    await client.from("bill_payments").upsert(
      {
        member_id: memberId,
        month,
        paid: false,
        paid_at: null,
        amount: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "member_id,month" }
    );
    // Symmetric upsert-style local update: update existing or insert if absent
    setPayments((prev) => {
      const exists = prev.find((p) => p.memberId === memberId && p.month === month);
      if (exists) {
        return prev.map((p) =>
          p.memberId === memberId && p.month === month
            ? { ...p, paid: false, paidAt: null, amount: 0 }
            : p
        );
      }
      return [...prev, { id: "optimistic", memberId, month, paid: false, paidAt: null, amount: 0 }];
    });
  };

  const getMonthTotals = (month: string) => {
    const monthExpenses = expenses.filter((e) => e.date.startsWith(month));
    const totalExpense = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const activeMemberCount = members.filter((m) => m.status === "active").length;
    const totalCookSalary = settings.cookSalary * activeMemberCount;
    const totalMonthlyExpense = totalExpense + totalCookSalary;
    const monthMeals = meals.filter((m) => m.date.startsWith(month));
    const totalMeals = monthMeals.reduce((s, m) => s + (m.morning ? 1 : 0) + (m.night ? 1 : 0), 0);
    const perMealCost = totalMeals > 0 ? totalMonthlyExpense / totalMeals : 0;
    return { totalExpense: totalMonthlyExpense, totalMeals, perMealCost };
  };

  const calculateMonthlyBill = (memberId: string, month: string): MonthlyBill => {
    const member = members.find((m) => m.id === memberId);
    const { perMealCost } = getMonthTotals(month);
    const memberMeals = meals.filter((m) => m.memberId === memberId && m.date.startsWith(month));
    const mealCount = memberMeals.reduce((s, m) => s + (m.morning ? 1 : 0) + (m.night ? 1 : 0), 0);
    const mealBill = mealCount * perMealCost;
    const memberEggs = eggs.filter((e) => e.memberId === memberId && e.date.startsWith(month));
    const eggCount = memberEggs.reduce((s, e) => s + e.count, 0);
    const eggBill = eggCount * settings.eggPrice;
    const cookShare = settings.cookSalary;
    const grossBill = mealBill + eggBill;
    const memberAdvances = advances.filter((a) => a.memberId === memberId && a.date.startsWith(month));
    const totalAdvance = memberAdvances.reduce((s, a) => s + a.amount, 0);
    const dueAmount = Math.max(0, grossBill - totalAdvance);
    const creditBalance = Math.max(0, totalAdvance - grossBill);
    return {
      memberId, memberName: member?.name ?? "Unknown",
      mealCount, perMealCost, mealBill,
      eggCount, eggBill, cookShare, grossBill,
      totalAdvance, dueAmount, creditBalance,
    };
  };

  const calculateAllMonthlyBills = (month: string): MonthlyBill[] =>
    members.filter((m) => m.status === "active").map((m) => calculateMonthlyBill(m.id, month));

  return (
    <DataContext.Provider value={{
      members, meals, expenses, advances, eggs, settings, payments, isLoaded,
      addMember, updateMember, deleteMember,
      setMeal,
      addExpense, updateExpense, deleteExpense,
      addAdvance, deleteAdvance,
      setEggEntry, updateSettings,
      markPaid, markUnpaid,
      calculateMonthlyBill, calculateAllMonthlyBills, getMonthTotals,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
