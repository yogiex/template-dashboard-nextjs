import { describe, expect, it } from "vitest";

import { escapeLabelValue, hasFailingCheck, renderPrometheusMetrics, toStatus } from "@/lib/health";

describe("escapeLabelValue", () => {
  it("escapes backslash, quote, dan newline sesuai format teks Prometheus", () => {
    expect(escapeLabelValue('a"b')).toBe('a\\"b');
    expect(escapeLabelValue("a\\b")).toBe("a\\\\b");
    expect(escapeLabelValue("a\nb")).toBe("a\\nb");
  });
});

describe("toStatus", () => {
  it("ok hanya bila seluruh check lulus", () => {
    expect(toStatus({ a: true, b: true })).toBe("ok");
    expect(toStatus({ a: true, b: false })).toBe("degraded");
    expect(hasFailingCheck({ a: true })).toBe(false);
    expect(hasFailingCheck({ a: false })).toBe(true);
  });
});

describe("renderPrometheusMetrics", () => {
  const base = {
    version: "0.1.0",
    environment: "test",
    uptimeSeconds: 12.5,
    degraded: false,
    totalEvents: 3,
    counters: {},
    latencySamples: [] as number[],
  };

  it("selalu menyertakan build info, uptime, dan health gauge", () => {
    const body = renderPrometheusMetrics(base);

    expect(body).toContain(
      '# TYPE app_build_info gauge\napp_build_info{version="0.1.0",environment="test"} 1',
    );
    expect(body).toContain("# TYPE app_uptime_seconds gauge\napp_uptime_seconds 12.5");
    expect(body).toContain("# TYPE app_health_degraded gauge\napp_health_degraded 0");
    expect(body).toContain("# TYPE app_metric_store_events gauge\napp_metric_store_events 3");
  });

  it("menyalin counter dengan label nama metrik dan mengurutkannya", () => {
    const body = renderPrometheusMetrics({
      ...base,
      counters: { "auth.login.success": 4, "auth.login.failure": 1 },
    });

    expect(body).toContain('# TYPE app_events_total counter');
    expect(body).toContain('app_events_total{name="auth.login.failure"} 1');
    expect(body).toContain('app_events_total{name="auth.login.success"} 4');
    expect(body.indexOf("auth.login.failure")).toBeLessThan(body.indexOf("auth.login.success"));
  });

  it("tidak mengemis summary latensi saat belum ada sampel", () => {
    const body = renderPrometheusMetrics(base);

    expect(body).toContain("# TYPE app_server_action_latency_ms gauge");
    expect(body).not.toContain("app_server_action_latency_ms_count");
  });

  it("menghitung quantile dari sampel latensi dan mengurutkannya lebih dulu", () => {
    const body = renderPrometheusMetrics({
      ...base,
      latencySamples: [40, 10, 30, 20],
    });

    expect(body).toContain('app_server_action_latency_ms{quantile="0.5"} 20');
    expect(body).toContain('app_server_action_latency_ms{quantile="0.95"} 40');
    expect(body).toContain('app_server_action_latency_ms{quantile="0.99"} 40');
    expect(body).toContain("app_server_action_latency_ms_sum 100");
    expect(body).toContain("app_server_action_latency_ms_count 4");
  });

  it("menandai 1 saat ada probe yang gagal", () => {
    expect(renderPrometheusMetrics({ ...base, degraded: true })).toContain(
      "app_health_degraded 1",
    );
  });

  it("mengakhiri body dengan newline agar format Prometheus valid", () => {
    expect(renderPrometheusMetrics(base).endsWith("\n")).toBe(true);
  });
});
