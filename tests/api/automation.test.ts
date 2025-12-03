import { describe, it, expect, beforeAll, afterAll } from "vitest";

const BASE_URL = "http://localhost:5000";
let sessionCookie: string = "";

async function login() {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@saude.gov.br",
      password: "Admin@2025",
    }),
  });

  const cookies = response.headers.get("set-cookie");
  if (cookies) {
    const match = cookies.match(/connect\.sid=([^;]+)/);
    if (match) {
      sessionCookie = `connect.sid=${match[1]}`;
    }
  }

  return response.ok;
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Cookie: sessionCookie,
    },
  });
}

describe("Automation API Integration Tests", () => {
  beforeAll(async () => {
    const loginSuccess = await login();
    expect(loginSuccess).toBe(true);
  });

  describe("Forms API", () => {
    it("GET /api/forms/templates should return templates", async () => {
      const response = await fetchWithAuth(`${BASE_URL}/api/forms/templates`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    it("GET /api/forms/templates should include SINAN templates", async () => {
      const response = await fetchWithAuth(`${BASE_URL}/api/forms/templates`);
      const data = await response.json();
      
      const sinanTemplates = data.filter((t: any) => t.category === "sinan");
      expect(sinanTemplates.length).toBeGreaterThan(0);
    });

    it("GET /api/forms/templates/:slug should return specific template", async () => {
      const response = await fetchWithAuth(`${BASE_URL}/api/forms/templates/dengue`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.slug).toBe("dengue");
      expect(data.category).toBe("sinan");
    });

    it("GET /api/forms/categories should return categories", async () => {
      const response = await fetchWithAuth(`${BASE_URL}/api/forms/categories`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it("POST /api/forms/validate should validate payload", async () => {
      const response = await fetchWithAuth(`${BASE_URL}/api/forms/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateSlug: "dengue",
          payload: { nome: "Teste", cpf: "123.456.789-00" },
        }),
      });
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty("isValid");
    });
  });

  describe("Workflow API", () => {
    it("GET /api/workflow/definitions should return workflow definitions", async () => {
      const response = await fetchWithAuth(`${BASE_URL}/api/workflow/definitions`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(4);
    });

    it("GET /api/workflow/definitions should include SINAN workflow", async () => {
      const response = await fetchWithAuth(`${BASE_URL}/api/workflow/definitions`);
      const data = await response.json();
      
      const sinanWorkflow = data.find((w: any) => w.slug === "sinan");
      expect(sinanWorkflow).toBeDefined();
      expect(sinanWorkflow.name).toBe("Fluxo SINAN");
    });

    it("GET /api/workflow/stats should return stats", async () => {
      const response = await fetchWithAuth(`${BASE_URL}/api/workflow/stats`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty("total");
      expect(data).toHaveProperty("pending");
      expect(data).toHaveProperty("approved");
    });

    it("GET /api/workflow/available-actions should return actions", async () => {
      const response = await fetchWithAuth(
        `${BASE_URL}/api/workflow/available-actions?workflowSlug=sinan&status=pending&role=admin`
      );
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("Alerts API", () => {
    it("GET /api/alerts/rules should return alert rules", async () => {
      const response = await fetchWithAuth(`${BASE_URL}/api/alerts/rules`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    it("GET /api/alerts/active should return active alerts", async () => {
      const response = await fetchWithAuth(`${BASE_URL}/api/alerts/active`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it("GET /api/alerts/stats should return stats", async () => {
      const response = await fetchWithAuth(`${BASE_URL}/api/alerts/stats`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty("total");
      expect(data).toHaveProperty("active");
      expect(data).toHaveProperty("byCategory");
      expect(data).toHaveProperty("bySeverity");
    });

    it("GET /api/alerts/categories should return categories", async () => {
      const response = await fetchWithAuth(`${BASE_URL}/api/alerts/categories`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it("POST /api/alerts/:id/acknowledge should acknowledge alert", async () => {
      const response = await fetchWithAuth(`${BASE_URL}/api/alerts/alert-1/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.status).toBe("acknowledged");
    });

    it("POST /api/alerts/:id/resolve should resolve alert", async () => {
      const response = await fetchWithAuth(`${BASE_URL}/api/alerts/alert-2/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.status).toBe("resolved");
    });
  });

  describe("Strategic Reports API", () => {
    it("GET /api/strategic-reports/definitions should return report definitions", async () => {
      const response = await fetchWithAuth(`${BASE_URL}/api/strategic-reports/definitions`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(5);
    });

    it("GET /api/strategic-reports/definitions should include Previne Brasil", async () => {
      const response = await fetchWithAuth(`${BASE_URL}/api/strategic-reports/definitions`);
      const data = await response.json();
      
      const previneReport = data.find((r: any) => r.slug === "previne-brasil");
      expect(previneReport).toBeDefined();
      expect(previneReport.name).toContain("Previne Brasil");
    });

    it("GET /api/strategic-reports/categories should return categories", async () => {
      const response = await fetchWithAuth(`${BASE_URL}/api/strategic-reports/categories`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it("POST /api/strategic-reports/execute/:slug should execute report", async () => {
      const response = await fetchWithAuth(`${BASE_URL}/api/strategic-reports/execute/previne-brasil`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parameters: {} }),
      });
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty("executionId");
      expect(data).toHaveProperty("reportSlug");
      expect(data).toHaveProperty("data");
      expect(data).toHaveProperty("aggregations");
      expect(data).toHaveProperty("totalRows");
    });

    it("POST /api/strategic-reports/execute/farmacia-completo should return farmacia data", async () => {
      const response = await fetchWithAuth(`${BASE_URL}/api/strategic-reports/execute/farmacia-completo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parameters: {} }),
      });
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.reportSlug).toBe("farmacia-completo");
      expect(data.data.length).toBeGreaterThan(0);
    });

    it("POST /api/strategic-reports/execute/vigilancia-epi should return vigilancia data", async () => {
      const response = await fetchWithAuth(`${BASE_URL}/api/strategic-reports/execute/vigilancia-epi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parameters: {} }),
      });
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.reportSlug).toBe("vigilancia-epi");
    });
  });

  describe("Authentication", () => {
    it("should reject unauthenticated requests to /api/forms/templates", async () => {
      const response = await fetch(`${BASE_URL}/api/forms/templates`);
      expect(response.status).toBe(401);
    });

    it("should reject unauthenticated requests to /api/workflow/definitions", async () => {
      const response = await fetch(`${BASE_URL}/api/workflow/definitions`);
      expect(response.status).toBe(401);
    });

    it("should reject unauthenticated requests to /api/alerts/rules", async () => {
      const response = await fetch(`${BASE_URL}/api/alerts/rules`);
      expect(response.status).toBe(401);
    });

    it("should reject unauthenticated requests to /api/strategic-reports/definitions", async () => {
      const response = await fetch(`${BASE_URL}/api/strategic-reports/definitions`);
      expect(response.status).toBe(401);
    });
  });
});
