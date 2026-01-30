import { Transaction, TransactionCategory, WorkerType, TaxSummary } from '../types';

export const calculateTaxSummary = (transactions: Transaction[], workerType: WorkerType, state?: string): TaxSummary => {
    const totalGrossIncome = transactions
        .filter(t => t.category === TransactionCategory.INCOME)
        .reduce((acc, t) => acc + t.amount, 0);

    const totalBusinessExpenses = transactions
        .filter(t => t.isDeductible && t.category !== TransactionCategory.INCOME && t.category !== TransactionCategory.W2_WITHHOLDING)
        .reduce((acc, t) => acc + t.amount, 0);

    const totalWithholding = transactions
        .filter(t => t.category === TransactionCategory.W2_WITHHOLDING)
        .reduce((acc, t) => acc + t.amount, 0);

    const netProfit = Math.max(0, totalGrossIncome - totalBusinessExpenses);

    let estimatedTaxLiability = 0;
    let projectedRefund = 0;

    // Federal Calculation
    if (workerType === 'GIG') {
        const seTax = netProfit * 0.9235 * 0.153;
        const taxableIncome = Math.max(0, netProfit - (seTax / 2) - 15000);
        let incomeTax = 0;
        if (taxableIncome > 0) {
            incomeTax += Math.min(taxableIncome, 11925) * 0.10;
            if (taxableIncome > 11925) incomeTax += (taxableIncome - 11925) * 0.12;
        }
        estimatedTaxLiability = seTax + incomeTax;
    } else {
        const taxableIncome = Math.max(0, totalGrossIncome - 15000);
        let incomeTax = 0;
        if (taxableIncome > 0) {
            incomeTax += Math.min(taxableIncome, 11925) * 0.10;
            if (taxableIncome > 11925) incomeTax += (taxableIncome - 11925) * 0.12;
        }
        estimatedTaxLiability = incomeTax;
    }

    // Basic State Tax logic (Placeholder for MUST-HAVE)
    if (state === 'CA') {
        estimatedTaxLiability += netProfit * 0.04; // Simple 4% CA estimate
    } else if (state === 'NY') {
        estimatedTaxLiability += netProfit * 0.05; // Simple 5% NY estimate
    }

    if (workerType === 'W2') {
        projectedRefund = Math.max(0, totalWithholding - estimatedTaxLiability);
    }

    const effectiveTaxRate = totalGrossIncome > 0 ? (estimatedTaxLiability / totalGrossIncome) : 0;

    return {
        totalGrossIncome,
        totalBusinessExpenses,
        totalWithholding,
        netProfit,
        estimatedTaxLiability,
        projectedRefund,
        effectiveTaxRate
    };
};
