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

// All the pages of the system and the URL of each one.
export default function App() {
  return (
    <Routes>
      {/* 1. Landing page (has its own header) */}
      <Route path="/" element={<Landing />} />

      {/* Pages that share the header, navigation, and footer */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />              {/* 2 */}
        <Route path="/equipment" element={<EquipmentList />} />          {/* 3 */}
        <Route path="/equipment/new" element={<EquipmentForm />} />      {/* 5 */}
        <Route path="/equipment/:id" element={<EquipmentDetail />} />    {/* 4 */}
        <Route path="/equipment/:id/edit" element={<EquipmentForm />} /> {/* 5 */}
        <Route path="/borrowers" element={<Borrowers />} />              {/* 6 */}
        <Route path="/borrowings/new" element={<Booking />} />           {/* 7 */}
        <Route path="/borrowings" element={<Borrowings />} />            {/* 8 */}
        <Route path="/overdue" element={<OverdueFines />} />             {/* 9 */}
        <Route path="/statistics" element={<StatisticsPage />} />        {/* 10 */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
