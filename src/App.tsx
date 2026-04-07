/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import ConvertCase from './tools/ConvertCase';
import LineConverter from './tools/LineConverter';
import PercentageCalculator from './tools/PercentageCalculator';
import PdfScannerApp from './tools/PdfScannerApp';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="tools/convert-case" element={<ConvertCase />} />
              <Route path="tools/line-to-semicolon" element={<LineConverter />} />
              <Route path="tools/percentage-calculator" element={<PercentageCalculator />} />
              <Route path="tools/pdf-scanner" element={<PdfScannerApp />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}
