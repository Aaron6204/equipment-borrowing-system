// The shapes of the records returned by the API.

export type EquipmentType = "consumable" | "non-consumable";
export type Condition = "good" | "damaged" | "retired";
// Loans (non-consumables): in_review -> ready_for_pickup -> active -> returned (or overdue -> returned)
// Purchases (consumables): in_review -> ready_for_pickup -> purchased
export type BorrowingStatus =
  | "in_review"
  | "ready_for_pickup"
  | "active"
  | "returned"
  | "overdue"
  | "purchased"
  | "cancelled";

// The time ranges the statistics page can be filtered by.
export type StatisticsPeriod = "today" | "week" | "month" | "quarter" | "year" | "all";

export interface Category {
  _id: string;
  name: string;
  description: string;
  maxLoanDays: number;
  dailyFee: number;
}

export interface Equipment {
  _id: string;
  name: string;
  category: Category | null;
  type: EquipmentType;
  totalQuantity: number;
  reorderLevel: number;
  replacementCost: number;
  // Consumables only: what a student pays for one unit
  costPerUnit: number;
  // Non-consumables only (consumables are always "good")
  condition: Condition;
  // What is wrong with the item when its condition is "damaged"
  damageNotes?: string;
  // Computed by the server
  held: number;
  available: number;
  lowStock: boolean;
}

export interface Borrower {
  _id: string;
  studentNumber: string;
  name: string;
  email: string;
  type: "student" | "faculty";
  status: "active" | "inactive";
}

export interface Borrowing {
  _id: string;
  // Shared by every item checked out together (null on older single-item records)
  bookingId?: string | null;
  createdAt?: string;
  equipment?: {
    _id: string;
    name: string;
    type: string;
  };
  borrower?: {
    _id: string;
    name: string;
  };
  quantity: number;
  purpose?: string;
  status: BorrowingStatus;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  // Consumables only: price per unit, total to pay, and when it was paid for
  unitPrice?: number;
  totalPrice?: number;
  purchasedAt?: string | null;
  daysOverdue: number;
}

export interface OverdueBorrowing extends Borrowing {
  dailyFee: number;
  runningFee: number;
}

export interface Fine {
  _id: string;
  borrowing: { _id: string; equipment: { name: string } | null; quantity: number } | null;
  borrower: Borrower | null;
  daysOverdue: number;
  amount: number;
  status: "unpaid" | "paid";
  paidAt: string | null;
  createdAt: string;
}

export interface Standing {
  borrower: string;
  activeLoans: number;
  // Non-consumables requested or borrowed and not yet returned, and the most allowed at once
  openLoanUnits: number;
  loanLimit: number;
  overdueItems: number;
  unpaidFines: number;
  unpaidTotal: number;
  blocked: boolean;
  reasons: string[];
}

export interface Availability {
  equipment: string;
  type: EquipmentType;
  total: number;
  held: number;
  available: number;
  requested: number;
  canBorrow: boolean;
  reason: string;
}

export interface Statistics {
  period: { key: StatisticsPeriod; label: string; since: string | null };
  totals: {
    equipment: number;
    consumable: number;
    nonConsumable: number;
    borrowers: number;
    borrowings: number;
    activeBorrowings: number;
    overdueNow: number;
    lowStock: number;
  };
  // Loans only (non-consumables)
  byStatus: Record<Exclude<BorrowingStatus, "purchased">, number>;
  returns: { returned: number; onTime: number; late: number; onTimeRate: number; averageLoanDays: number };
  mostBorrowed: { _id: string; name: string; type: EquipmentType; units: number; times: number }[];
  // Consumables bought with cash
  sales: {
    count: number;
    units: number;
    revenue: number;
    average: number;
    awaitingPickup: number;
    topSellers: { _id: string; name: string; units: number; revenue: number; times: number }[];
  };
  fines: { count: number; collected: number; unpaid: number; highest: number; average: number };
}
