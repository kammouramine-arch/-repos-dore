import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { storekitReportEvents } from '../../mobile/src/lib/storekit-report';

describe('developer StoreKit report', () => {
  it('does not insert diagnostic rows in account settings or colored overlays', () => {
    expect(readFileSync('mobile/app/compte.tsx', 'utf8')).not.toContain('DiagnosticReport');
    const panel = readFileSync('mobile/src/components/diagnostic-report.tsx', 'utf8');
    expect(panel).not.toMatch(/cyan|magenta|pink|#00ffff|#ff00ff/i);
    expect(panel).toContain('visible={report !== null}');
  });
  it('retains native price/period/cache evidence and excludes sensitive payloads', () => {
    const report = JSON.stringify(storekitReportEvents([
      { area: 'billing', path: 'apple-products', at: '2026-09-09T00:00:00Z', durationMs: 100, code: 'PRODUCT_METADATA',
        displayPrice: '39,00 €', currency: 'EUR', storefront: 'FRA', subscriptionPeriodUnit: 'month', introEligible: true,
        receipt: 'SECRET', token: 'SECRET', transactionReference: 'PRIVATE' } as never,
      { area: 'billing', path: 'purchase', at: '', durationMs: 1, code: 'PRIVATE_PURCHASE' },
    ]));
    expect(report).toContain('39,00 €');
    expect(report).toContain('month');
    expect(report).not.toMatch(/SECRET|PRIVATE/);
  });
  it('enables the view only for the separate diagnostic build profile', () => {
    const config = readFileSync('mobile/app.config.ts', 'utf8');
    expect(config).toContain("storekitDiagnostics: process.env.EAS_BUILD_PROFILE === 'testflight-diagnostics'");
    const eas = JSON.parse(readFileSync('mobile/eas.json', 'utf8'));
    expect(eas.build['testflight-diagnostics'].extends).toBe('production');
    expect(eas.build.production.env.STOREKIT_DIAGNOSTICS).toBeUndefined();
    const component = readFileSync('mobile/src/components/diagnostic-report.tsx', 'utf8');
    expect(component).toContain('storekitDiagnostics) return null');
    expect(component).toContain('Clipboard.setStringAsync');
  });
});
