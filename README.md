# Carbon Ledger MRV Pilot 🌍

A Minimum Viable Product (MVP) for **Measurement, Reporting, and Verification (MRV)** of product carbon footprints, designed for CBAM compliance.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-live-success.svg)

## 🚀 Live Demo
**[Launch App](https://adarbayev.github.io/carbon-ledger-mrv/)**

## ✨ Key Features

### 1. Installation & Boundaries
- Define installation details and reporting period.
- Manage operational boundaries with evidence tracking.
- **New:** Country selection drives grid emission factor (EF) lookups.

### 2. Activity Data (emissions source)
- **Fuels:** Integrated IPCC 2006 emission factors for standard fuels (Natural Gas, Diesel, etc.). Auto-calculates tCO₂.
- **Electricity:** Location-based method using country-specific grid factors. Support for custom EF overrides.

### 3. Allocation & Products
- **CBAM Support:** Built-in list of CN Codes (Annex I) grouped by sector (Cement, Aluminum, Hydrogen, etc.).
- **Complex Goods:** "Russian Doll" approach to add precursor emissions for complex products (e.g., Sinter used in Pig Iron).
- **Emissions Allocation:** Mass-based allocation logic with residue/waste handling.

### 4. MRV Results
- **PCF Calculation:** Real-time calculation of Specific Embedded Emissions (SEE) in tCO₂/t.
- **Transparency:** Breakdown of Direct (Scope 1), Indirect (Scope 2), and Precursor emissions.
- **CBAM Cost Estimator:** Estimate carbon border tax liability based on export volume, free allocation reduction, and carbon price paid at origin.

## 🛠️ Tech Stack
- **Framework:** React + Vite
- **Styling:** Tailwind CSS v4 (Modern, utility-first)
- **State:** React Context API + LocalStorage persistence
- **Icons:** Lucide React
- **Charts:** Recharts

## 💻 Local Development

1.  **Clone the repo**
    ```bash
    git clone https://github.com/adarbayev/carbon-ledger-mrv.git
    cd carbon-ledger-mrv
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run dev server**
    ```bash
    npm run dev
    ```

4.  **Build for production**
    ```bash
    npm run build
    ```

## 📄 License
MIT License - feel free to use and adapt for your own MRV needs.
