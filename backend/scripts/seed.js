// Seed script: clears the database and loads sample data for the demonstration.
// Run with: npm run seed
require("dotenv").config();
const mongoose = require("mongoose");

const Category = require("../models/Category");
const Equipment = require("../models/Equipment");
const Borrower = require("../models/Borrower");
const Borrowing = require("../models/Borrowing");
const Fine = require("../models/Fine");
const { computeDueDate } = require("../utils/dates");

// Returns a date a number of days before today.
function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Clearing old data...");

  await Promise.all([
    Category.deleteMany({}),
    Equipment.deleteMany({}),
    Borrower.deleteMany({}),
    Borrowing.deleteMany({}),
    Fine.deleteMany({}),
  ]);

  const [measuring, electronics, sports, supplies] = await Category.insertMany([
    { name: "Measuring Tools", description: "Rulers, protractors, and similar tools", maxLoanDays: 3, dailyFee: 5 },
    { name: "Electronics", description: "Calculators, projectors, and cables", maxLoanDays: 2, dailyFee: 20 },
    { name: "Sports Equipment", description: "Balls, rackets, and nets", maxLoanDays: 1, dailyFee: 15 },
    { name: "Office Supplies", description: "Paper, glue, tape, and other consumables", maxLoanDays: 1, dailyFee: 0 },
  ]);

  const N = "non-consumable";
  const C = "consumable";
  const items = await Equipment.insertMany([
    { name: "Ruler (30 cm)", category: measuring._id, type: N, totalQuantity: 20, replacementCost: 25 },
    { name: "Protractor", category: measuring._id, type: N, totalQuantity: 12, replacementCost: 30 },
    { name: "Scientific Calculator", category: electronics._id, type: N, totalQuantity: 10, replacementCost: 800 },
    { name: "LCD Projector", category: electronics._id, type: N, totalQuantity: 3, replacementCost: 18000 },
    { name: "HDMI Cable", category: electronics._id, type: N, totalQuantity: 6, replacementCost: 350 },
    { name: "Extension Cord", category: electronics._id, type: N, totalQuantity: 4, replacementCost: 450, condition: "damaged" },
    { name: "Basketball", category: sports._id, type: N, totalQuantity: 8, replacementCost: 900 },
    { name: "Volleyball", category: sports._id, type: N, totalQuantity: 6, replacementCost: 750 },
    { name: "Badminton Racket", category: sports._id, type: N, totalQuantity: 10, replacementCost: 400 },
    { name: "Bond Paper (sheet)", category: supplies._id, type: C, totalQuantity: 500, reorderLevel: 100 },
    { name: "Glue Stick", category: supplies._id, type: C, totalQuantity: 6, reorderLevel: 10 },
    { name: "Masking Tape", category: supplies._id, type: C, totalQuantity: 15, reorderLevel: 5 },
    { name: "Whiteboard Marker", category: supplies._id, type: C, totalQuantity: 0, reorderLevel: 8 },
  ]);
  const item = (name) => items.find((i) => i.name === name);

  const people = await Borrower.insertMany([
    { studentNumber: "2023-100101", name: "Maria Santos", email: "santosm@students.example.edu", type: "student" },
    { studentNumber: "2023-100102", name: "Juan Dela Cruz", email: "delacruzj@students.example.edu", type: "student" },
    { studentNumber: "2023-100103", name: "Angela Reyes", email: "reyesa@students.example.edu", type: "student" },
    { studentNumber: "2024-100104", name: "Carlo Mendoza", email: "mendozac@students.example.edu", type: "student" },
    { studentNumber: "2024-100105", name: "Bea Villanueva", email: "villanuevab@students.example.edu", type: "student" },
    { studentNumber: "FAC-0021", name: "Prof. Ramon Garcia", email: "rgarcia@faculty.example.edu", type: "faculty" },
    { studentNumber: "FAC-0034", name: "Prof. Liza Aquino", email: "laquino@faculty.example.edu", type: "faculty" },
    { studentNumber: "2022-100099", name: "Paolo Navarro", email: "navarrop@students.example.edu", type: "student", status: "inactive" },
  ]);
  const person = (name) => people.find((p) => p.name === name);

  // Builds one borrowing. "borrowed" is how many days ago it was requested.
  function borrowing(equipmentName, borrowerName, quantity, status, borrowed, extra = {}) {
    const equipment = item(equipmentName);
    const borrower = person(borrowerName);
    const category = [measuring, electronics, sports, supplies].find((c) => c._id.equals(equipment.category));
    const borrowDate = daysAgo(borrowed);
    const multiplier = borrower.type === "faculty" ? 2 : 1;
    const dueDate = equipment.type === N ? computeDueDate(borrowDate, category.maxLoanDays * multiplier) : null;
    const wasReleased = ["released", "returned", "issued"].includes(status);
    return {
      equipment: equipment._id,
      borrower: borrower._id,
      quantity,
      status,
      borrowDate,
      dueDate,
      releasedAt: wasReleased ? borrowDate : null,
      purpose: "",
      ...extra,
    };
  }

  const borrowings = await Borrowing.insertMany([
    // Waiting for approval
    borrowing("Scientific Calculator", "Maria Santos", 2, "pending", 0, { purpose: "Statistics quiz" }),
    borrowing("Bond Paper (sheet)", "Angela Reyes", 50, "pending", 0, { purpose: "Org event programs" }),
    borrowing("LCD Projector", "Prof. Liza Aquino", 1, "pending", 0, { purpose: "Capstone defense" }),
    // Approved, waiting to be released
    borrowing("Badminton Racket", "Carlo Mendoza", 4, "approved", 0, { purpose: "PE class" }),
    borrowing("Masking Tape", "Bea Villanueva", 2, "approved", 0, { purpose: "Booth setup" }),
    // Currently out and on time
    borrowing("Ruler (30 cm)", "Maria Santos", 3, "released", 1, { purpose: "Drafting plates" }),
    borrowing("LCD Projector", "Prof. Ramon Garcia", 1, "released", 1, { purpose: "Lecture" }),
    borrowing("HDMI Cable", "Prof. Ramon Garcia", 1, "released", 1, { purpose: "Lecture" }),
    // Currently out and OVERDUE
    borrowing("Basketball", "Juan Dela Cruz", 2, "released", 4, { purpose: "Intramurals practice" }),
    borrowing("Scientific Calculator", "Carlo Mendoza", 1, "released", 5, { purpose: "Physics exam" }),
    // Consumables already issued (final)
    borrowing("Glue Stick", "Angela Reyes", 4, "issued", 2, { purpose: "Poster making" }),
    borrowing("Bond Paper (sheet)", "Bea Villanueva", 100, "issued", 6, { purpose: "Reviewer printing" }),
    // Returned on time
    borrowing("Volleyball", "Bea Villanueva", 2, "returned", 8, { returnDate: daysAgo(7), purpose: "PE class" }),
    borrowing("Protractor", "Angela Reyes", 5, "returned", 10, { returnDate: daysAgo(8), purpose: "Math activity" }),
    borrowing("Ruler (30 cm)", "Juan Dela Cruz", 2, "returned", 12, { returnDate: daysAgo(10), purpose: "Drafting" }),
    // Returned late (these have fines)
    borrowing("Scientific Calculator", "Juan Dela Cruz", 1, "returned", 14, { returnDate: daysAgo(9), purpose: "Midterm exam" }),
    borrowing("Basketball", "Angela Reyes", 1, "returned", 9, { returnDate: daysAgo(6), purpose: "Practice" }),
    // Cancelled
    borrowing("LCD Projector", "Maria Santos", 1, "cancelled", 3, { purpose: "Class report" }),
  ]);

  // Fines for the two late returns above.
  const lateCalculator = borrowings[15]; // 2 loan days, returned 3 days late, PHP 20 per day
  const lateBasketball = borrowings[16]; // 1 loan day, returned 2 days late, PHP 15 per day
  await Fine.insertMany([
    { borrowing: lateCalculator._id, borrower: lateCalculator.borrower, daysOverdue: 3, amount: 60, status: "unpaid" },
    { borrowing: lateBasketball._id, borrower: lateBasketball.borrower, daysOverdue: 2, amount: 30, status: "paid", paidAt: daysAgo(5) },
  ]);

  console.log(`Seeded: 4 categories, ${items.length} equipment, ${people.length} borrowers, ${borrowings.length} borrowings, 2 fines`);
  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error("Seeding failed:", error.message);
  process.exit(1);
});
