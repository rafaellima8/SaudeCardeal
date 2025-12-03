import { describe, it, expect } from "vitest";
import { strategicReportEngine, STRATEGIC_REPORTS } from "../../modules/reports/strategic-reports";

describe("Strategic Reports", () => {
  describe("STRATEGIC_REPORTS", () => {
    it("should have at least 5 strategic reports", () => {
      expect(STRATEGIC_REPORTS.length).toBeGreaterThanOrEqual(5);
    });

    it("should have Previne Brasil report", () => {
      const previneReport = STRATEGIC_REPORTS.find(r => r.slug === "previne-brasil");
      expect(previneReport).toBeDefined();
      expect(previneReport?.name).toContain("Previne Brasil");
      expect(previneReport?.category).toBe("previne");
    });

    it("should have Farmácia report", () => {
      const farmaciaReport = STRATEGIC_REPORTS.find(r => r.slug === "farmacia-completo");
      expect(farmaciaReport).toBeDefined();
      expect(farmaciaReport?.category).toBe("farmacia");
    });

    it("should have Vigilância Epidemiológica report", () => {
      const vigilanciaReport = STRATEGIC_REPORTS.find(r => r.slug === "vigilancia-epi");
      expect(vigilanciaReport).toBeDefined();
      expect(vigilanciaReport?.category).toBe("vigilancia");
    });

    it("should have TFD report", () => {
      const tfdReport = STRATEGIC_REPORTS.find(r => r.slug === "tfd-completo");
      expect(tfdReport).toBeDefined();
    });

    it("should have Fraldas report", () => {
      const fraldasReport = STRATEGIC_REPORTS.find(r => r.slug === "fraldas-assistencia");
      expect(fraldasReport).toBeDefined();
    });
  });

  describe("Report Structure", () => {
    it("each report should have required properties", () => {
      STRATEGIC_REPORTS.forEach(report => {
        expect(report.id).toBeDefined();
        expect(report.slug).toBeDefined();
        expect(report.name).toBeDefined();
        expect(report.description).toBeDefined();
        expect(report.category).toBeDefined();
        expect(report.exportFormats).toBeDefined();
        expect(Array.isArray(report.exportFormats)).toBe(true);
      });
    });

    it("each report should support PDF export", () => {
      STRATEGIC_REPORTS.forEach(report => {
        expect(report.exportFormats).toContain("pdf");
      });
    });

    it("each report should support CSV export", () => {
      STRATEGIC_REPORTS.forEach(report => {
        expect(report.exportFormats).toContain("csv");
      });
    });
  });

  describe("Report Categories", () => {
    it("should have reports in previne category", () => {
      const previneReports = STRATEGIC_REPORTS.filter(r => r.category === "previne");
      expect(previneReports.length).toBeGreaterThan(0);
    });

    it("should have reports in farmacia category", () => {
      const farmaciaReports = STRATEGIC_REPORTS.filter(r => r.category === "farmacia");
      expect(farmaciaReports.length).toBeGreaterThan(0);
    });

    it("should have reports in vigilancia category", () => {
      const vigilanciaReports = STRATEGIC_REPORTS.filter(r => r.category === "vigilancia");
      expect(vigilanciaReports.length).toBeGreaterThan(0);
    });
  });

  describe("getReport", () => {
    it("should return report by slug", () => {
      const report = strategicReportEngine.getReport("previne-brasil");
      expect(report).toBeDefined();
      expect(report?.slug).toBe("previne-brasil");
    });

    it("should return farmacia report", () => {
      const report = strategicReportEngine.getReport("farmacia-completo");
      expect(report).toBeDefined();
    });

    it("should return undefined for unknown slug", () => {
      const report = strategicReportEngine.getReport("unknown-report");
      expect(report).toBeUndefined();
    });
  });

  describe("getReportsByCategory", () => {
    it("should return reports filtered by category", () => {
      const previneReports = strategicReportEngine.getReportsByCategory("previne");
      expect(Array.isArray(previneReports)).toBe(true);
      previneReports.forEach(report => {
        expect(report.category).toBe("previne");
      });
    });

    it("should return empty array for unknown category", () => {
      const unknownReports = strategicReportEngine.getReportsByCategory("unknown");
      expect(unknownReports).toEqual([]);
    });
  });

  describe("getAllCategories", () => {
    it("should return unique categories", () => {
      const categories = strategicReportEngine.getAllCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      
      const uniqueCategories = [...new Set(categories)];
      expect(categories.length).toBe(uniqueCategories.length);
    });

    it("should include main categories", () => {
      const categories = strategicReportEngine.getAllCategories();
      expect(categories).toContain("previne");
      expect(categories).toContain("farmacia");
    });
  });
});
