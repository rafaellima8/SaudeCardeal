import { describe, it, expect } from "vitest";
import { alertScheduler, DEFAULT_ALERTS } from "../../modules/alerts/alert-scheduler";

describe("Alert Scheduler", () => {
  describe("DEFAULT_ALERTS", () => {
    it("should have at least 5 default alert rules", () => {
      expect(DEFAULT_ALERTS.length).toBeGreaterThanOrEqual(5);
    });

    it("should have stock alert rule", () => {
      const stockAlert = DEFAULT_ALERTS.find(a => a.category === "estoque");
      expect(stockAlert).toBeDefined();
    });

    it("should have deadline alert rule", () => {
      const deadlineAlert = DEFAULT_ALERTS.find(a => a.category === "prazo");
      expect(deadlineAlert).toBeDefined();
    });

    it("should have pendencia alert rule", () => {
      const pendenciaAlert = DEFAULT_ALERTS.find(a => a.category === "pendencia");
      expect(pendenciaAlert).toBeDefined();
    });

    it("should have financial risk alert rule", () => {
      const financialAlert = DEFAULT_ALERTS.find(a => a.category === "risco_financeiro");
      expect(financialAlert).toBeDefined();
    });
  });

  describe("Alert Rule Structure", () => {
    it("each alert should have required properties", () => {
      DEFAULT_ALERTS.forEach(alert => {
        expect(alert.id).toBeDefined();
        expect(alert.slug).toBeDefined();
        expect(alert.name).toBeDefined();
        expect(alert.category).toBeDefined();
        expect(alert.severity).toBeDefined();
      });
    });

    it("severity should be valid value", () => {
      const validSeverities = ["critical", "warning", "info", "urgent"];
      DEFAULT_ALERTS.forEach(alert => {
        expect(validSeverities).toContain(alert.severity);
      });
    });
  });

  describe("getAlertBySlug", () => {
    it("should return alert rule by slug", () => {
      const firstAlert = DEFAULT_ALERTS[0];
      const found = alertScheduler.getAlertBySlug(firstAlert.slug);
      expect(found).toBeDefined();
      expect(found?.slug).toBe(firstAlert.slug);
    });

    it("should return null for unknown slug", () => {
      const found = alertScheduler.getAlertBySlug("unknown-alert");
      expect(found).toBeNull();
    });
  });

  describe("getAlertsByCategory", () => {
    it("should return alerts filtered by category", () => {
      const estoqueAlerts = alertScheduler.getAlertsByCategory("estoque");
      expect(Array.isArray(estoqueAlerts)).toBe(true);
      estoqueAlerts.forEach(alert => {
        expect(alert.category).toBe("estoque");
      });
    });

    it("should return empty array for unknown category", () => {
      const unknownAlerts = alertScheduler.getAlertsByCategory("unknown-category");
      expect(unknownAlerts).toEqual([]);
    });
  });

  describe("getAlertsBySeverity", () => {
    it("should return alerts filtered by severity", () => {
      const criticalAlerts = alertScheduler.getAlertsBySeverity("critical");
      expect(Array.isArray(criticalAlerts)).toBe(true);
      criticalAlerts.forEach(alert => {
        expect(alert.severity).toBe("critical");
      });
    });

    it("should return high severity alerts", () => {
      const highAlerts = alertScheduler.getAlertsBySeverity("high");
      expect(Array.isArray(highAlerts)).toBe(true);
    });
  });

  describe("getAllCategories", () => {
    it("should return unique categories", () => {
      const categories = alertScheduler.getAllCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      
      const uniqueCategories = [...new Set(categories)];
      expect(categories.length).toBe(uniqueCategories.length);
    });
  });
});
