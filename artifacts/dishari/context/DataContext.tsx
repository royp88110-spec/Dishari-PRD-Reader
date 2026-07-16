import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { isSupabaseConfigured } from "@/lib/supabase";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

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

export interface Fine {
  id: string;
  memberId: string;
  amount: number;
  date: string;
  reason: string;
  notes?: string;
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
  fineTotal: number;
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
  fines: Fine[];
  settings: Settings;
  payments: BillPayment[];
  paymentsError: string | null;
  announcements: Announcement[];
  isLoaded: boolean;
  addMember: (m: Omit<Member, "id">) => Promise<void>;
  updateMember: (id: string, u: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  setMeal: (memberId: string, date: string, morning: boolean, night: boolean) => Promise<void>;
  setMealsBatch: (entries: { memberId: string; date: string; morning: boolean; night: boolean }[]) => Promise<void>;
  addExpense: (e: Omit<Expense, "id">) => Promise<void>;
  updateExpense: (id: string, u: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addAdvance: (a: Omit<Advance, "id">) => Promise<void>;
  deleteAdvance: (id: string) => Promise<void>;
  addFine: (f: Omit<Fine, "id">) => Promise<void>;
  updateFine: (id: string, u: Partial<Fine>) => Promise<void>;
  deleteFine: (id: string) => Promise<void>;
  setEggEntry: (memberId: string, date: string, count: number) => Promise<void>;
  updateSettings: (s: Partial<Settings>) => Promise<void>;
  addAnnouncement: (title: string, body: string) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  markPaid: (memberId: string, month: string, amount: number) => Promise<void>;
  markUnpaid: (memberId: string, month: string) => Promise<void>;
  calculateMonthlyBill: (memberId: string, month: string) => MonthlyBill;
  calculateAllMonthlyBills: (month: string) => MonthlyBill[];
  getMonthTotals: (month: string) => { totalExpense: number; totalMeals: number; perMealCost: number };
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const getApiBase = (): string => {
  if (Platform.OS === "web") return "";
  // EXPO_PUBLIC_API_URL is the canonical override for EAS / production APK builds.
  // Set it via: eas secret:create --name EXPO_PUBLIC_API_URL --value https://your-api.example.com
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (apiUrl) return apiUrl.replace(/\/$/, "");
  // Fallback: EXPO_PUBLIC_DOMAIN is injected by the Replit dev script only.
  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";
  return domain ? `https://${domain}` : "";
};

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

/**
 * Throw a descriptive error if a Supabase operation returned an error.
 * The Supabase JS client never throws — callers must check the returned error.
 */
function checkError(result: { error: { message: string } | null }): void {
  if (result.error) throw new Error(result.error.message);
}

/**
 * Throw if the operation errored OR returned no data.
 * Use for inserts/updates that return a row (.select().single()).
 */
function getData<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("No data returned from database.");
  return result.data;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [eggs, setEggs] = useState<EggEntry[]>([]);
  const [settings, setSettings] = useState<Settings>({ eggPrice: 12, cookSalary: 250 });
  const [fines, setFines] = useState<Fine[]>([]);
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
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
    const { data, error } = await client.from("bill_payments").select("*");
    if (error) {
      setPaymentsError(error.message);
      setPayments([]);
      return;
    }
    setPaymentsError(null);
    if (data) {
      setPayments(
        (data as Record<string, unknown>[]).map((p) => ({
          id: p.id as string,
          memberId: p.member_id as string,
          month: p.month as string,
          paid: p.paid as boolean,
          paidAt: (p.paid_at as string | null) ?? null,
          amount: p.amount != null ? Number(p.amount) : 0,
        }))
      );
    }
  }, []);

  const fetchFines = useCallback(async () => {
    const client = await sb();
    const { data } = await client.from("fines").select("*").order("date", { ascending: false });
    if (data) {
      setFines(
        (data as Record<string, unknown>[]).map((f) => ({
          id: f.id as string,
          memberId: f.member_id as string,
          amount: Number(f.amount),
          date: f.date as string,
          reason: (f.reason as string) || "",
          notes: (f.notes as string | undefined) ?? undefined,
        }))
      );
    }
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    const client = await sb();
    const { data } = await client.from("announcements").select("*").order("created_at", { ascending: false });
    if (data) {
      setAnnouncements(
        (data as Record<string, unknown>[]).map((a) => ({
          id: a.id as string,
          title: a.title as string,
          body: a.body as string,
          createdAt: a.created_at as string,
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
      fetchFines(),
      fetchAnnouncements(),
    ]);
    setIsLoaded(true);
  }, [fetchMembers, fetchMeals, fetchExpenses, fetchAdvances, fetchEggs, fetchSettings, fetchPayments, fetchFines, fetchAnnouncements]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoaded(true);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    sb().then((client) => {
      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
        if (session) {
          loadAll().catch((err: Error) => console.error("[DataContext] loadAll failed:", err.message));
        } else {
          setMembers([]); setMeals([]); setExpenses([]);
          setAdvances([]); setEggs([]); setPayments([]);
          setFines([]); setAnnouncements([]);
          setSettings({ eggPrice: 12, cookSalary: 250 });
          setIsLoaded(false);
        }
      });
      unsubscribe = () => subscription.unsubscribe();

      client.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          loadAll().catch((err: Error) => {
            console.error("[DataContext] initial loadAll failed:", err.message);
            setIsLoaded(true);
          });
        } else {
          setIsLoaded(true);
        }
      }).catch((err: Error) => {
        console.error("[DataContext] getSession failed:", err.message);
        setIsLoaded(true);
      });
    }).catch((err: Error) => {
      console.error("[DataContext] Supabase client init failed:", err.message);
      setIsLoaded(true);
    });

    return () => { unsubscribe?.(); };
  }, [loadAll]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let channel: ReturnType<Awaited<ReturnType<typeof sb>>["channel"]> | null = null;

    const safeAsync = (fn: () => Promise<void>, label: string) => () => {
      fn().catch((err: Error) => console.error(`[DataContext] ${label} failed:`, err.message));
    };

    sb().then((client) => {
      channel = client
        .channel("dishari-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "members" }, safeAsync(fetchMembers, "fetchMembers"))
        .on("postgres_changes", { event: "*", schema: "public", table: "meals" }, safeAsync(fetchMeals, "fetchMeals"))
        .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, safeAsync(fetchExpenses, "fetchExpenses"))
        .on("postgres_changes", { event: "*", schema: "public", table: "advances" }, safeAsync(fetchAdvances, "fetchAdvances"))
        .on("postgres_changes", { event: "*", schema: "public", table: "eggs" }, safeAsync(fetchEggs, "fetchEggs"))
        .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, safeAsync(fetchSettings, "fetchSettings"))
        .on("postgres_changes", { event: "*", schema: "public", table: "bill_payments" }, safeAsync(fetchPayments, "fetchPayments"))
        .on("postgres_changes", { event: "*", schema: "public", table: "fines" }, safeAsync(fetchFines, "fetchFines"))
        .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, safeAsync(fetchAnnouncements, "fetchAnnouncements"))
        .subscribe();
    }).catch((err: Error) => {
      console.error("[DataContext] realtime channel setup failed:", err.message);
    });

    return () => {
      sb().then((client) => {
        if (channel) client.removeChannel(channel!).catch((err: Error) => {
          console.error("[DataContext] removeChannel failed:", err.message);
        });
      }).catch((err: Error) => {
        console.error("[DataContext] cleanup sb() failed:", err.message);
      });
    };
  }, [fetchMembers, fetchMeals, fetchExpenses, fetchAdvances, fetchEggs, fetchSettings, fetchPayments, fetchFines, fetchAnnouncements]);

  // ── Members ──────────────────────────────────────────────────────────────
  // addMember: server-first (API creates auth user + row, returns the row).
  // Commit the returned row to local state — no rollback needed.
  const addMember = async (m: Omit<Member, "id">) => {
    const res = await apiCall("POST", "/admin/members", {
      name: m.name, phone: m.phone, email: m.email,
      roomNumber: m.roomNumber, joinDate: m.joinDate,
      status: m.status, password: m.password,
    }) as { success: boolean; member: Record<string, unknown> };
    const r = res.member;
    const newMember: Member = {
      id: r.id as string,
      name: r.name as string,
      phone: r.phone as string,
      email: (r.email as string | undefined) ?? undefined,
      joinDate: r.join_date as string,
      roomNumber: (r.room_number as string | undefined) ?? undefined,
      status: r.status as "active" | "inactive",
      password: "",
    };
    setMembers((prev) =>
      [...prev, newMember].sort((a, b) => a.name.localeCompare(b.name))
    );
  };

  const updateMember = async (id: string, u: Partial<Member>) => {
    // Per-entity optimistic update: snapshot only this member, revert only this
    // member on failure — concurrent realtime updates to other members are unaffected.
    const prevMember = members.find((m) => m.id === id);
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, ...u } : m)));
    try {
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
        checkError(await client.from("members").update(row).eq("id", id));
      }
    } catch (err) {
      if (prevMember) setMembers((ms) => ms.map((m) => (m.id === id ? prevMember : m)));
      throw err;
    }
  };

  const deleteMember = async (id: string) => {
    const prevMember = members.find((m) => m.id === id);
    setMembers((ms) => ms.filter((m) => m.id !== id));
    try {
      await apiCall("DELETE", `/admin/members/${id}`);
    } catch (err) {
      // Re-insert the member only if realtime hasn't already done so
      if (prevMember) {
        setMembers((ms) =>
          ms.some((m) => m.id === id)
            ? ms
            : [...ms, prevMember].sort((a, b) => a.name.localeCompare(b.name))
        );
      }
      throw err;
    }
  };

  // ── Meals ─────────────────────────────────────────────────────────────────
  const setMeal = async (memberId: string, date: string, morning: boolean, night: boolean) => {
    const prevMeal = meals.find((m) => m.memberId === memberId && m.date === date);
    // Optimistic update
    setMeals((ms) => {
      const idx = ms.findIndex((m) => m.memberId === memberId && m.date === date);
      if (idx >= 0) {
        const next = [...ms];
        next[idx] = { ...next[idx], morning, night };
        return next;
      }
      return [...ms, { id: `opt-${memberId}-${date}`, memberId, date, morning, night }];
    });
    try {
      const client = await sb();
      // Avoid upsert onConflict — requires UNIQUE constraint. Instead: check then insert/update.
      const { data: existing, error: fetchErr } = await client
        .from("meals")
        .select("id")
        .eq("member_id", memberId)
        .eq("date", date)
        .maybeSingle();
      if (fetchErr) throw new Error(fetchErr.message);
      if (existing) {
        checkError(await client.from("meals").update({ morning, night }).eq("id", existing.id));
      } else {
        checkError(await client.from("meals").insert({ member_id: memberId, date, morning, night }));
      }
    } catch (err) {
      // Revert only this meal slot
      setMeals((ms) => {
        const without = ms.filter((m) => !(m.memberId === memberId && m.date === date));
        return prevMeal ? [...without, prevMeal] : without;
      });
      throw err;
    }
  };

  const setMealsBatch = async (entries: { memberId: string; date: string; morning: boolean; night: boolean }[]) => {
    if (entries.length === 0) return;
    // Snapshot all affected slots before mutating
    const affectedKeys = new Set(entries.map((e) => `${e.memberId}|${e.date}`));
    const prevSlots = meals.filter((m) => affectedKeys.has(`${m.memberId}|${m.date}`));
    // Optimistic update
    setMeals((ms) => {
      const next = [...ms];
      for (const e of entries) {
        const idx = next.findIndex((m) => m.memberId === e.memberId && m.date === e.date);
        if (idx >= 0) {
          next[idx] = { ...next[idx], morning: e.morning, night: e.night };
        } else {
          next.push({ id: `opt-${e.memberId}-${e.date}`, memberId: e.memberId, date: e.date, morning: e.morning, night: e.night });
        }
      }
      return next;
    });
    try {
      const client = await sb();
      // Fetch existing rows for all affected (member_id, date) pairs in one query
      const uniqueDates = [...new Set(entries.map((e) => e.date))];
      const memberIds = [...new Set(entries.map((e) => e.memberId))];
      const { data: existingRows, error: fetchErr } = await client
        .from("meals")
        .select("id, member_id, date")
        .in("date", uniqueDates)
        .in("member_id", memberIds);
      if (fetchErr) throw new Error(fetchErr.message);
      const existingMap = new Map(
        (existingRows ?? []).map((r) => [`${r.member_id as string}|${r.date as string}`, r.id as string])
      );
      const toInsert = entries.filter((e) => !existingMap.has(`${e.memberId}|${e.date}`));
      const toUpdate = entries.filter((e) => existingMap.has(`${e.memberId}|${e.date}`));
      if (toInsert.length > 0) {
        checkError(
          await client.from("meals").insert(
            toInsert.map((e) => ({ member_id: e.memberId, date: e.date, morning: e.morning, night: e.night }))
          )
        );
      }
      // Run updates in parallel — each row has different values so can't batch in one UPDATE
      if (toUpdate.length > 0) {
        const results = await Promise.all(
          toUpdate.map((e) => {
            const id = existingMap.get(`${e.memberId}|${e.date}`)!;
            return client.from("meals").update({ morning: e.morning, night: e.night }).eq("id", id);
          })
        );
        for (const res of results) checkError(res);
      }
    } catch (err) {
      // Revert only the affected slots, leave everything else intact
      setMeals((ms) => {
        const withoutAffected = ms.filter((m) => !affectedKeys.has(`${m.memberId}|${m.date}`));
        return [...withoutAffected, ...prevSlots];
      });
      throw err;
    }
  };

  // ── Expenses ──────────────────────────────────────────────────────────────
  // addExpense: server-first (insert returns the created row).
  const addExpense = async (e: Omit<Expense, "id">) => {
    const client = await sb();
    const r = getData(
      await client.from("expenses").insert({
        type: e.type, shop_name: e.shopName ?? null, date: e.date,
        items: e.items ?? null, amount: e.amount, notes: e.notes ?? null,
      }).select().single()
    ) as Record<string, unknown>;
    setExpenses((prev) => [
      {
        id: r.id as string,
        type: r.type as Expense["type"],
        shopName: (r.shop_name as string | undefined) ?? undefined,
        date: r.date as string,
        items: (r.items as string | undefined) ?? undefined,
        amount: Number(r.amount),
        notes: (r.notes as string | undefined) ?? undefined,
      },
      ...prev,
    ]);
  };

  const updateExpense = async (id: string, u: Partial<Expense>) => {
    const prevExpense = expenses.find((e) => e.id === id);
    setExpenses((es) => es.map((e) => (e.id === id ? { ...e, ...u } : e)));
    try {
      const row: Record<string, unknown> = {};
      if (u.type !== undefined) row.type = u.type;
      if (u.shopName !== undefined) row.shop_name = u.shopName;
      if (u.date !== undefined) row.date = u.date;
      if (u.items !== undefined) row.items = u.items;
      if (u.amount !== undefined) row.amount = u.amount;
      if (u.notes !== undefined) row.notes = u.notes;
      const client = await sb();
      checkError(await client.from("expenses").update(row).eq("id", id));
    } catch (err) {
      if (prevExpense) setExpenses((es) => es.map((e) => (e.id === id ? prevExpense : e)));
      throw err;
    }
  };

  const deleteExpense = async (id: string) => {
    const prevExpense = expenses.find((e) => e.id === id);
    setExpenses((es) => es.filter((e) => e.id !== id));
    try {
      const client = await sb();
      checkError(await client.from("expenses").delete().eq("id", id));
    } catch (err) {
      if (prevExpense) {
        setExpenses((es) =>
          es.some((e) => e.id === id) ? es : [prevExpense, ...es]
        );
      }
      throw err;
    }
  };

  // ── Advances ──────────────────────────────────────────────────────────────
  // addAdvance: server-first (insert returns the created row).
  const addAdvance = async (a: Omit<Advance, "id">) => {
    const client = await sb();
    const r = getData(
      await client.from("advances").insert({
        member_id: a.memberId, amount: a.amount, date: a.date,
        method: a.method, notes: a.notes ?? null,
      }).select().single()
    ) as Record<string, unknown>;
    setAdvances((prev) => [
      {
        id: r.id as string,
        memberId: r.member_id as string,
        amount: Number(r.amount),
        date: r.date as string,
        method: (r.method as string) || "Cash",
        notes: (r.notes as string | undefined) ?? undefined,
      },
      ...prev,
    ]);
  };

  const deleteAdvance = async (id: string) => {
    const prevAdvance = advances.find((a) => a.id === id);
    setAdvances((as) => as.filter((a) => a.id !== id));
    try {
      const client = await sb();
      checkError(await client.from("advances").delete().eq("id", id));
    } catch (err) {
      if (prevAdvance) {
        setAdvances((as) =>
          as.some((a) => a.id === id) ? as : [prevAdvance, ...as]
        );
      }
      throw err;
    }
  };

  // ── Eggs ──────────────────────────────────────────────────────────────────
  const setEggEntry = async (memberId: string, date: string, count: number) => {
    const prevEgg = eggs.find((e) => e.memberId === memberId && e.date === date);
    setEggs((es) => {
      const without = es.filter((e) => !(e.memberId === memberId && e.date === date));
      if (count === 0) return without;
      return [...without, { id: prevEgg?.id ?? `opt-${memberId}-${date}`, memberId, date, count }];
    });
    try {
      const client = await sb();
      if (count === 0) {
        checkError(await client.from("eggs").delete().match({ member_id: memberId, date }));
      } else {
        checkError(
          await client.from("eggs").upsert(
            { member_id: memberId, date, count },
            { onConflict: "member_id,date" }
          )
        );
      }
    } catch (err) {
      // Revert only this egg slot
      setEggs((es) => {
        const without = es.filter((e) => !(e.memberId === memberId && e.date === date));
        return prevEgg ? [...without, prevEgg] : without;
      });
      throw err;
    }
  };

  // ── Settings ──────────────────────────────────────────────────────────────
  const updateSettings = async (s: Partial<Settings>) => {
    const prev = settings;
    const next = { ...settings, ...s };
    setSettings(next);
    try {
      const client = await sb();
      checkError(
        await client.from("settings").upsert(
          { id: 1, egg_price: next.eggPrice, cook_salary: next.cookSalary },
          { onConflict: "id" }
        )
      );
    } catch (err) {
      setSettings(prev);
      throw err;
    }
  };

  // ── Bill payments ─────────────────────────────────────────────────────────
  // Helper: build the base row payload for bill_payments inserts.
  // The DB may have a separate `year` column (NOT NULL); we always populate it
  // so inserts don't violate the constraint regardless of schema variant.
  const buildPaymentRow = (memberId: string, month: string, extra: Record<string, unknown>) => {
    const year = Number(month.split("-")[0]);
    return { member_id: memberId, month, year, ...extra };
  };

  const markPaid = async (memberId: string, month: string, amount: number) => {
    const prevPayment = payments.find((p) => p.memberId === memberId && p.month === month);
    const now = new Date().toISOString();
    setPayments((ps) => {
      const without = ps.filter((p) => !(p.memberId === memberId && p.month === month));
      return [...without, { id: prevPayment?.id ?? "optimistic", memberId, month, paid: true, paidAt: now, amount }];
    });
    try {
      const client = await sb();
      // Use the real DB row ID when available — avoids an extra SELECT and any race
      const existingId = prevPayment && prevPayment.id !== "optimistic" ? prevPayment.id : null;
      if (existingId) {
        checkError(
          await client.from("bill_payments")
            .update({ paid: true, paid_at: now })
            .eq("id", existingId)
        );
      } else {
        // No local row yet — check DB before inserting to avoid duplicates
        const { data: dbRow, error: selectErr } = await client
          .from("bill_payments")
          .select("id")
          .eq("member_id", memberId)
          .eq("month", month)
          .maybeSingle();
        if (selectErr) throw new Error(selectErr.message);
        if (dbRow?.id) {
          checkError(
            await client.from("bill_payments")
              .update({ paid: true, paid_at: now })
              .eq("id", dbRow.id)
          );
        } else {
          checkError(
            await client.from("bill_payments")
              .insert(buildPaymentRow(memberId, month, { paid: true, paid_at: now }))
          );
        }
      }
    } catch (err) {
      setPayments((ps) => {
        const without = ps.filter((p) => !(p.memberId === memberId && p.month === month));
        return prevPayment ? [...without, prevPayment] : without;
      });
      throw err;
    }
  };

  const markUnpaid = async (memberId: string, month: string) => {
    const prevPayment = payments.find((p) => p.memberId === memberId && p.month === month);
    setPayments((ps) => {
      const without = ps.filter((p) => !(p.memberId === memberId && p.month === month));
      return [...without, { id: prevPayment?.id ?? "optimistic", memberId, month, paid: false, paidAt: null, amount: 0 }];
    });
    try {
      const client = await sb();
      const existingId = prevPayment && prevPayment.id !== "optimistic" ? prevPayment.id : null;
      if (existingId) {
        checkError(
          await client.from("bill_payments")
            .update({ paid: false, paid_at: null })
            .eq("id", existingId)
        );
      } else {
        const { data: dbRow, error: selectErr } = await client
          .from("bill_payments")
          .select("id")
          .eq("member_id", memberId)
          .eq("month", month)
          .maybeSingle();
        if (selectErr) throw new Error(selectErr.message);
        if (dbRow?.id) {
          checkError(
            await client.from("bill_payments")
              .update({ paid: false, paid_at: null })
              .eq("id", dbRow.id)
          );
        } else {
          checkError(
            await client.from("bill_payments")
              .insert(buildPaymentRow(memberId, month, { paid: false, paid_at: null }))
          );
        }
      }
    } catch (err) {
      setPayments((ps) => {
        const without = ps.filter((p) => !(p.memberId === memberId && p.month === month));
        return prevPayment ? [...without, prevPayment] : without;
      });
      throw err;
    }
  };

  // ── Fines ─────────────────────────────────────────────────────────────────
  // Helper: detect "notes column not in schema cache" errors from old DBs.
  const isNotesColumnMissing = (e: { message?: string } | null) =>
    !!(e?.message?.includes("notes") && (e.message.includes("schema cache") || e.message.includes("does not exist")));

  // addFine: server-first (insert returns the created row).
  // If the notes column is missing (pre-migration DB), the insert is retried without
  // notes so the fine is still saved — notes are silently dropped until migrated.
  const addFine = async (f: Omit<Fine, "id">) => {
    const client = await sb();
    let result = await client.from("fines").insert({
      member_id: f.memberId, amount: f.amount, date: f.date, reason: f.reason,
      ...(f.notes ? { notes: f.notes } : {}),
    }).select().single();
    if (isNotesColumnMissing(result.error)) {
      result = await client.from("fines").insert({
        member_id: f.memberId, amount: f.amount, date: f.date, reason: f.reason,
      }).select().single();
    }
    const r = getData(result) as Record<string, unknown>;
    setFines((prev) => [
      {
        id: r.id as string,
        memberId: r.member_id as string,
        amount: Number(r.amount),
        date: r.date as string,
        reason: (r.reason as string) || "",
        notes: (r.notes as string | undefined) ?? undefined,
      },
      ...prev,
    ]);
  };

  const updateFine = async (id: string, u: Partial<Fine>) => {
    const prevFine = fines.find((f) => f.id === id);
    setFines((fs) => fs.map((f) => (f.id === id ? { ...f, ...u } : f)));
    try {
      const row: Record<string, unknown> = {};
      if (u.memberId !== undefined) row.member_id = u.memberId;
      if (u.amount !== undefined) row.amount = u.amount;
      if (u.date !== undefined) row.date = u.date;
      if (u.reason !== undefined) row.reason = u.reason;
      // Include notes in the update (supports both setting and clearing to null).
      // If the notes column is missing, retry without it so the rest of the update succeeds.
      if ("notes" in u) row.notes = (u.notes && u.notes.trim()) ? u.notes.trim() : null;
      const client = await sb();
      let updateResult = await client.from("fines").update(row).eq("id", id);
      if (isNotesColumnMissing(updateResult.error)) {
        const { notes: _dropped, ...rowWithoutNotes } = row;
        updateResult = await client.from("fines").update(rowWithoutNotes).eq("id", id);
      }
      checkError(updateResult);
    } catch (err) {
      if (prevFine) setFines((fs) => fs.map((f) => (f.id === id ? prevFine : f)));
      throw err;
    }
  };

  const deleteFine = async (id: string) => {
    const prevFine = fines.find((f) => f.id === id);
    setFines((fs) => fs.filter((f) => f.id !== id));
    try {
      const client = await sb();
      checkError(await client.from("fines").delete().eq("id", id));
    } catch (err) {
      if (prevFine) {
        setFines((fs) =>
          fs.some((f) => f.id === id) ? fs : [prevFine, ...fs]
        );
      }
      throw err;
    }
  };

  // ── Announcements ─────────────────────────────────────────────────────────
  const addAnnouncement = async (title: string, body: string) => {
    const client = await sb();
    const row = getData(
      await client.from("announcements").insert({ title, body }).select().single()
    ) as Record<string, unknown>;
    setAnnouncements((prev) => [{
      id: row.id as string,
      title: row.title as string,
      body: row.body as string,
      createdAt: row.created_at as string,
    }, ...prev]);
  };

  const deleteAnnouncement = async (id: string) => {
    const prev = announcements.find((a) => a.id === id);
    setAnnouncements((as) => as.filter((a) => a.id !== id));
    try {
      const client = await sb();
      checkError(await client.from("announcements").delete().eq("id", id));
    } catch (err) {
      if (prev) setAnnouncements((as) => [prev, ...as]);
      throw err;
    }
  };

  // ── Calculations ──────────────────────────────────────────────────────────
  const getMonthTotals = (month: string) => {
    const monthExpenses = expenses.filter((e) => e.date.startsWith(month));
    const totalExpense = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const monthMeals = meals.filter((m) => m.date.startsWith(month));
    const totalMeals = monthMeals.reduce((s, m) => s + (m.morning ? 1 : 0) + (m.night ? 1 : 0), 0);
    const perMealCost = totalMeals > 0 ? totalExpense / totalMeals : 0;
    return { totalExpense, totalMeals, perMealCost };
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
    const memberFines = fines.filter((f) => f.memberId === memberId && f.date.startsWith(month));
    const fineTotal = memberFines.reduce((s, f) => s + f.amount, 0);
    const grossBill = mealBill + eggBill + cookShare + fineTotal;
    const memberAdvances = advances.filter((a) => a.memberId === memberId && a.date.startsWith(month));
    const totalAdvance = memberAdvances.reduce((s, a) => s + a.amount, 0);
    const dueAmount = Math.max(0, grossBill - totalAdvance);
    const creditBalance = Math.max(0, totalAdvance - grossBill);
    return {
      memberId, memberName: member?.name ?? "Unknown",
      mealCount, perMealCost, mealBill,
      eggCount, eggBill, cookShare, fineTotal, grossBill,
      totalAdvance, dueAmount, creditBalance,
    };
  };

  const calculateAllMonthlyBills = (month: string): MonthlyBill[] =>
    members.filter((m) => m.status === "active").map((m) => calculateMonthlyBill(m.id, month));

  return (
    <DataContext.Provider value={{
      members, meals, expenses, advances, eggs, fines, settings, payments, paymentsError, announcements, isLoaded,
      addMember, updateMember, deleteMember,
      setMeal, setMealsBatch,
      addExpense, updateExpense, deleteExpense,
      addAdvance, deleteAdvance,
      addFine, updateFine, deleteFine,
      setEggEntry, updateSettings,
      addAnnouncement, deleteAnnouncement,
      markPaid, markUnpaid,
      calculateMonthlyBill, calculateAllMonthlyBills, getMonthTotals,
      refresh: loadAll,
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
