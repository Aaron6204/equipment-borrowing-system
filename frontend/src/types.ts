// The shapes of the records returned by the API.

export type EquipmentType = "consumable" | "non-consumable";
export type Condition = "good" | "damaged" | "retired";
export type BorrowingStatus = "pending" | "approved" | "released" | "returned" | "issued" | "cancelled";

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
  condition: Condition;
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
  status: "in_review" | "ready_for_pickup" | "active" | "returned" | "overdue" | "cancelled";
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
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
  byStatus: Record<BorrowingStatus, number>;
  returns: { returned: number; onTime: number; late: number; onTimeRate: number; averageLoanDays: number };
  mostBorrowed: { _id: string; name: string; type: EquipmentType; units: number; times: number }[];
  fines: { count: number; collected: number; unpaid: number; highest: number; average: number };
}
