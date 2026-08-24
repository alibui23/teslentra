import { Route, Routes } from "react-router-dom";
import {
  AssetDetails,
  Assets,
  Barcode,
  Dashboard,
  Locations,
  Login,
  PartDetails,
  Parts,
  Purchases,
} from "../pages";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/assets" element={<Assets />} />
      <Route path="/parts" element={<Parts />} />
      <Route path="/barcode" element={<Barcode />} />
      <Route path="/purchases" element={<Purchases />} />
      <Route path="/locations" element={<Locations />} />
      <Route path="/parts/:id" element={<PartDetails />} />
      <Route path="/assets/:id" element={<AssetDetails />} />
    </Routes>
  );
}
