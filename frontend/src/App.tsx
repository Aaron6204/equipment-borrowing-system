import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import EquipmentList from "./pages/EquipmentList";
import EquipmentDetail from "./pages/EquipmentDetail";
import EquipmentForm from "./pages/EquipmentForm";
import Borrowers from "./pages/Borrowers";
import Booking from "./pages/Booking";
import Borrowings from "./pages/Borrowings";
import OverdueFines from "./pages/OverdueFines";
import StatisticsPage from "./pages/StatisticsPage";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ProtectedRoute from "./components/ProtectedRoute";

// All the pages of the system and the URL of each one.
export default function App() {
  return (
    <Routes>
      {/* 1. Landing page (has its own header) */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Auth mode="login" />} />
      <Route path="/register" element={<Auth mode="register" />} />

      {/* Pages that share the header, navigation, and footer */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/equipment" element={<EquipmentList />} />
          <Route path="/equipment/new" element={<EquipmentForm />} />
          <Route path="/equipment/:id" element={<EquipmentDetail />} />
          <Route path="/equipment/:id/edit" element={<EquipmentForm />} />
          <Route path="/borrowers" element={<Borrowers />} />
          <Route path="/borrowings/new" element={<Booking />} />
          <Route path="/borrowings" element={<Borrowings />} />
          <Route path="/overdue" element={<OverdueFines />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
