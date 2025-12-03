import { describe, it, expect } from "vitest";
import { workflowEngine, WORKFLOW_DEFINITIONS } from "../../modules/workflow/workflow-engine";

describe("Workflow Engine", () => {
  describe("WORKFLOW_DEFINITIONS", () => {
    it("should have SINAN workflow defined", () => {
      const sinanWorkflow = WORKFLOW_DEFINITIONS.find(w => w.slug === "sinan");
      expect(sinanWorkflow).toBeDefined();
      expect(sinanWorkflow?.name).toBe("Fluxo SINAN");
      expect(sinanWorkflow?.entityType).toBe("sinan_notification");
    });

    it("should have TFD workflow defined", () => {
      const tfdWorkflow = WORKFLOW_DEFINITIONS.find(w => w.slug === "tfd");
      expect(tfdWorkflow).toBeDefined();
      expect(tfdWorkflow?.name).toBe("Fluxo TFD");
      expect(tfdWorkflow?.entityType).toBe("tfd_request");
    });

    it("should have Prescription workflow defined", () => {
      const prescriptionWorkflow = WORKFLOW_DEFINITIONS.find(w => w.slug === "prescription");
      expect(prescriptionWorkflow).toBeDefined();
      expect(prescriptionWorkflow?.name).toBe("Fluxo Prescrição");
    });

    it("should have Diaper workflow defined", () => {
      const diaperWorkflow = WORKFLOW_DEFINITIONS.find(w => w.slug === "diaper");
      expect(diaperWorkflow).toBeDefined();
      expect(diaperWorkflow?.name).toBe("Fluxo Fraldas");
    });

    it("should have at least 4 workflow definitions", () => {
      expect(WORKFLOW_DEFINITIONS.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("SINAN Workflow Steps", () => {
    it("should have 3 steps", () => {
      const sinanWorkflow = WORKFLOW_DEFINITIONS.find(w => w.slug === "sinan");
      expect(sinanWorkflow?.steps.length).toBe(3);
    });

    it("should have correct step order", () => {
      const sinanWorkflow = WORKFLOW_DEFINITIONS.find(w => w.slug === "sinan");
      const steps = sinanWorkflow?.steps || [];
      
      expect(steps[0].order).toBe(0);
      expect(steps[0].name).toContain("Unidade");
      
      expect(steps[1].order).toBe(1);
      expect(steps[1].name).toContain("Vigilância");
      
      expect(steps[2].order).toBe(2);
      expect(steps[2].name).toContain("CPD");
    });

    it("should have auto-approve configured for vigilância step", () => {
      const sinanWorkflow = WORKFLOW_DEFINITIONS.find(w => w.slug === "sinan");
      const vigilanciaStep = sinanWorkflow?.steps.find(s => s.order === 1);
      expect(vigilanciaStep?.autoApproveAfterHours).toBe(72);
    });
  });

  describe("TFD Workflow Steps", () => {
    it("should have required fields for first step", () => {
      const tfdWorkflow = WORKFLOW_DEFINITIONS.find(w => w.slug === "tfd");
      const firstStep = tfdWorkflow?.steps[0];
      expect(firstStep?.requiredFields).toBeDefined();
      expect(firstStep?.requiredFields?.includes("cidPrimary")).toBe(true);
    });
  });

  describe("getWorkflowBySlug", () => {
    it("should return sinan workflow", () => {
      const workflow = workflowEngine.getWorkflowBySlug("sinan");
      expect(workflow).toBeDefined();
      expect(workflow?.slug).toBe("sinan");
    });

    it("should return tfd workflow", () => {
      const workflow = workflowEngine.getWorkflowBySlug("tfd");
      expect(workflow).toBeDefined();
      expect(workflow?.slug).toBe("tfd");
    });

    it("should return null for unknown slug", () => {
      const workflow = workflowEngine.getWorkflowBySlug("unknown");
      expect(workflow).toBeNull();
    });
  });

  describe("getAvailableActions", () => {
    it("should return actions for pending status with admin role", () => {
      const actions = workflowEngine.getAvailableActionsForWorkflow("sinan", "pending", "admin");
      expect(actions).toBeDefined();
      expect(Array.isArray(actions)).toBe(true);
    });

    it("should return empty array for invalid workflow", () => {
      const actions = workflowEngine.getAvailableActionsForWorkflow("invalid", "pending", "admin");
      expect(actions).toEqual([]);
    });
  });

  describe("validateTransition", () => {
    it("should validate a valid transition", () => {
      const result = workflowEngine.validateWorkflowTransition("sinan", "pending", "in_progress", "admin");
      expect(result).toBeDefined();
    });

    it("should reject invalid workflow", () => {
      const result = workflowEngine.validateWorkflowTransition("invalid", "pending", "approved", "admin");
      expect(result.isValid).toBe(false);
    });
  });
});
