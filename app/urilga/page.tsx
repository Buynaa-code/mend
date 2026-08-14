import type { Metadata, Viewport } from "next";
import { UrilgaApp } from "../UrilgaApp";
import "../urilga.css";

export const metadata: Metadata = {
  title: "Гэр бүрэх — Т. Ганхуяг",
  description: "Т. Ганхуягийн Гэр бүрэх ёслолын цахим урилга",
};

export const viewport: Viewport = {
  themeColor: "#f4efe6",
};

export default function UrilgaPage() {
  return <UrilgaApp />;
}
