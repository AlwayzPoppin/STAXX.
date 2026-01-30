import { describe, it, expect } from 'vitest';
import { calculateTaxSummary } from '../utils/taxCalculations';
import { Transaction, TransactionCategory, WorkerType } from '../types';

describe('Tax Logic Unit Tests', () => {
    const mockTransactions: Transaction[] = [
        { id: '1', date: '2024-01-01', description: 'Gig Income', amount: 1000, category: TransactionCategory.INCOME, isDeductible: false, confidence: 1 },
        { id: '2', date: '2024-01-02', description: 'Software', amount: 100, category: TransactionCategory.BUSINESS_EQUIPMENT, isDeductible: true, confidence: 1 },
        { id: '3', date: '2024-01-03', description: 'Personal Lunch', amount: 50, category: TransactionCategory.OTHER, isDeductible: false, confidence: 1 },
    ];

    it('calculates GIG worker taxes correctly', () => {
        const summary = calculateTaxSummary(mockTransactions, 'GIG');

        expect(summary.totalGrossIncome).toBe(1000);
        expect(summary.totalBusinessExpenses).toBe(100);
        expect(summary.netProfit).toBe(900); // 1000 - 100

        // Liability: 900 * 0.9235 * 0.153 = 127.16595
        expect(summary.estimatedTaxLiability).toBeCloseTo(127.166, 3);
    });

    it('calculates W-2 worker taxes correctly', () => {
        const w2Transactions: Transaction[] = [
            { id: '1', date: '2024-01-01', description: 'Paycheck', amount: 2000, category: TransactionCategory.INCOME, isDeductible: false, confidence: 1 },
            { id: '2', date: '2024-01-01', description: 'Tax Withheld', amount: 500, category: TransactionCategory.W2_WITHHOLDING, isDeductible: true, confidence: 1 },
        ];

        const summary = calculateTaxSummary(w2Transactions, 'W2');

        expect(summary.totalGrossIncome).toBe(2000);
        expect(summary.totalWithholding).toBe(500);

        // Liability: 2000 * 0.15 = 300
        expect(summary.estimatedTaxLiability).toBe(300);

        // Refund: 500 - 300 = 200
        expect(summary.projectedRefund).toBe(200);
    });

    it('handles zero income', () => {
        const summary = calculateTaxSummary([], 'GIG');
        expect(summary.totalGrossIncome).toBe(0);
        expect(summary.estimatedTaxLiability).toBe(0);
    });
});
