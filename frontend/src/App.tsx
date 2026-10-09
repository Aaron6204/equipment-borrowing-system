import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import EquipmentList from "./pages/EquipmentList";
import EquipmentDetail from "./pages/EquipmentDetail";
import EquipmentForm from "./pages/EquipmentForm";
import Booking from "./pages/Booking";
import Borrowings from "./pages/Borrowings";
import OverdueFines from "./pages/OverdueFines";
import StatisticsPage from "./pages/StatisticsPage";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ProtectedRoute from "./components/ProtectedRoute";
import Users from "./pages/Users";

export default function App() {
  return (
    <Routes>
      {/* 1. Public Pages */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Auth mode="login" />} />
      <Route path="/register" element={<Auth mode="register" />} />

      {/* 2. Protected Pages (Must be logged in to enter) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          
          {/* General Routes: Both Borrowers and Admins can access these */}
          <Route path="/equipment" element={<EquipmentList />} />
          <Route path="/borrowings/new" element={<Booking />} />
          <Route path="/borrowings" element={<Borrowings />} />
          <Route path="*" element={<NotFound />} />

          {/* Admin-Only Routes: Borrowers will be kicked back to /equipment */}
          <Route element={<ProtectedRoute requireAdmin={true} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/equipment/new" element={<EquipmentForm />} />
            
            {/* MOVED: Details page is now Admin Only! */}
            <Route path="/equipment/:id" element={<EquipmentDetail />} />
            
            <Route path="/equipment/:id/edit" element={<EquipmentForm />} />
            <Route path="/overdue" element={<OverdueFines />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/users" element={<Users />} />
          </Route>

        </Route>
      </Route>
    </Routes>
  );
}