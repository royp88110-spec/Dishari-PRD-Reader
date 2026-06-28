import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

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
  calculateMonthlyBill: (memberId: string, month: string) => MonthlyBill;
  calculateAllMonthlyBills: (month: string) => MonthlyBill[];
  getMonthTotals: (month: string) => { totalExpense: number; totalMeals: number; perMealCost: number };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const uid = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

const KEYS = {
  members: "@dishari_members",
  meals: "@dishari_meals",
  expenses: "@dishari_expenses",
  advances: "@dishari_advances",
  eggs: "@dishari_eggs",
  settings: "@dishari_settings",
  init: "@dishari_initialized",
};

function getSeedData() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const m = `${year}-${month}`;

  const members: Member[] = [
    { id: "m1", name: "Rahul Ahmed", phone: "01711111111", password: "rahul123", roomNumber: "101", status: "active", joinDate: `${m}-01` },
    { id: "m2", name: "Amit Kumar", phone: "01722222222", password: "amit123", roomNumber: "102", status: "active", joinDate: `${m}-01` },
    { id: "m3", name: "Priya Sharma", phone: "01733333333", password: "priya123", roomNumber: "103", status: "active", joinDate: `${m}-01` },
  ];

  const expenses: Expense[] = [
    { id: uid(), type: "grocery", shopName: "City Mart", date: `${m}-05`, items: "Rice, Dal, Oil", amount: 1500, notes: "" },
    { id: uid(), type: "vegetable", shopName: "Bazaar", date: `${m}-10`, items: "Tomato, Potato, Onion", amount: 800, notes: "" },
    { id: uid(), type: "fish", shopName: "Fish Market", date: `${m}-15`, items: "Rohu fish 2kg", amount: 600, notes: "" },
    { id: uid(), type: "gas", date: `${m}-01`, amount: 400, notes: "Gas cylinder" },
  ];

  const meals: Meal[] = [];
  const memberIds = ["m1", "m2", "m3"];
  for (let day = 1; day <= today.getDate(); day++) {
    const dateStr = `${m}-${String(day).padStart(2, "0")}`;
    memberIds.forEach((mid) => {
      meals.push({
        id: uid(),
        memberId: mid,
        date: dateStr,
        morning: day % 7 !== 0,
        night: day % 14 !== 0,
      });
    });
  }

  const eggs: EggEntry[] = [
    { id: uid(), memberId: "m1", date: `${m}-10`, count: 3 },
    { id: uid(), memberId: "m2", date: `${m}-10`, count: 2 },
    { id: uid(), memberId: "m1", date: `${m}-20`, count: 4 },
    { id: uid(), memberId: "m3", date: `${m}-20`, count: 2 },
  ];

  const advances: Advance[] = [
    { id: uid(), memberId: "m1", amount: 2000, date: `${m}-01`, method: "Cash", notes: "Monthly advance" },
    { id: uid(), memberId: "m2", amount: 1500, date: `${m}-05`, method: "bKash", notes: "" },
  ];

  return { members, meals, expenses, advances, eggs };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [eggs, setEggs] = useState<EggEntry[]>([]);
  const [settings, setSettings] = useState<Settings>({ eggPrice: 12, cookSalary: 250 });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const initialized = await AsyncStorage.getItem(KEYS.init);
      if (!initialized) {
        const seed = getSeedData();
        await AsyncStorage.multiSet([
          [KEYS.members, JSON.stringify(seed.members)],
          [KEYS.meals, JSON.stringify(seed.meals)],
          [KEYS.expenses, JSON.stringify(seed.expenses)],
          [KEYS.advances, JSON.stringify(seed.advances)],
          [KEYS.eggs, JSON.stringify(seed.eggs)],
          [KEYS.settings, JSON.stringify({ eggPrice: 12, cookSalary: 250 })],
          [KEYS.init, "1"],
        ]);
        setMembers(seed.members);
        setMeals(seed.meals);
        setExpenses(seed.expenses);
        setAdvances(seed.advances);
        setEggs(seed.eggs);
      } else {
        const vals = await AsyncStorage.multiGet([
          KEYS.members, KEYS.meals, KEYS.expenses, KEYS.advances, KEYS.eggs, KEYS.settings,
        ]);
        const parse = (v: string | null, fallback: unknown) => v ? JSON.parse(v) : fallback;
        setMembers(parse(vals[0][1], []));
        setMeals(parse(vals[1][1], []));
        setExpenses(parse(vals[2][1], []));
        setAdvances(parse(vals[3][1], []));
        setEggs(parse(vals[4][1], []));
        setSettings(parse(vals[5][1], { eggPrice: 12, cookSalary: 250 }));
      }
      setIsLoaded(true);
    })();
  }, []);

  const save = async (key: string, data: unknown) => AsyncStorage.setItem(key, JSON.stringify(data));

  const addMember = async (m: Omit<Member, "id">) => {
    const next = [...members, { ...m, id: uid() }];
    setMembers(next); await save(KEYS.members, next);
  };
  const updateMember = async (id: string, u: Partial<Member>) => {
    const next = members.map((m) => m.id === id ? { ...m, ...u } : m);
    setMembers(next); await save(KEYS.members, next);
  };
  const deleteMember = async (id: string) => {
    const next = members.filter((m) => m.id !== id);
    setMembers(next); await save(KEYS.members, next);
  };

  const setMeal = async (memberId: string, date: string, morning: boolean, night: boolean) => {
    const existing = meals.find((m) => m.memberId === memberId && m.date === date);
    let next: Meal[];
    if (existing) {
      next = meals.map((m) => m.memberId === memberId && m.date === date ? { ...m, morning, night } : m);
    } else {
      next = [...meals, { id: uid(), memberId, date, morning, night }];
    }
    setMeals(next); await save(KEYS.meals, next);
  };

  const addExpense = async (e: Omit<Expense, "id">) => {
    const next = [...expenses, { ...e, id: uid() }];
    setExpenses(next); await save(KEYS.expenses, next);
  };
  const updateExpense = async (id: string, u: Partial<Expense>) => {
    const next = expenses.map((e) => e.id === id ? { ...e, ...u } : e);
    setExpenses(next); await save(KEYS.expenses, next);
  };
  const deleteExpense = async (id: string) => {
    const next = expenses.filter((e) => e.id !== id);
    setExpenses(next); await save(KEYS.expenses, next);
  };

  const addAdvance = async (a: Omit<Advance, "id">) => {
    const next = [...advances, { ...a, id: uid() }];
    setAdvances(next); await save(KEYS.advances, next);
  };
  const deleteAdvance = async (id: string) => {
    const next = advances.filter((a) => a.id !== id);
    setAdvances(next); await save(KEYS.advances, next);
  };

  const setEggEntry = async (memberId: string, date: string, count: number) => {
    const existing = eggs.find((e) => e.memberId === memberId && e.date === date);
    let next: EggEntry[];
    if (count === 0) {
      next = existing ? eggs.filter((e) => !(e.memberId === memberId && e.date === date)) : eggs;
    } else if (existing) {
      next = eggs.map((e) => e.memberId === memberId && e.date === date ? { ...e, count } : e);
    } else {
      next = [...eggs, { id: uid(), memberId, date, count }];
    }
    setEggs(next); await save(KEYS.eggs, next);
  };

  const updateSettings = async (s: Partial<Settings>) => {
    const next = { ...settings, ...s };
    setSettings(next); await save(KEYS.settings, next);
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
    const { perMealCost, totalExpense, totalMeals } = getMonthTotals(month);

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
      memberId,
      memberName: member?.name ?? "Unknown",
      mealCount,
      perMealCost,
      mealBill,
      eggCount,
      eggBill,
      cookShare,
      grossBill,
      totalAdvance,
      dueAmount,
      creditBalance,
    };
  };

  const calculateAllMonthlyBills = (month: string): MonthlyBill[] =>
    members.filter((m) => m.status === "active").map((m) => calculateMonthlyBill(m.id, month));

  return (
    <DataContext.Provider value={{
      members, meals, expenses, advances, eggs, settings, isLoaded,
      addMember, updateMember, deleteMember,
      setMeal,
      addExpense, updateExpense, deleteExpense,
      addAdvance, deleteAdvance,
      setEggEntry,
      updateSettings,
      calculateMonthlyBill,
      calculateAllMonthlyBills,
      getMonthTotals,
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
