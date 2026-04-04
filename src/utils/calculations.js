
// Net Balance

/**
 * Computes net balance from total income and total expense.
 * @param {number} totalIncome
 * @param {number} totalExpense
 * @returns {number}
 */
const computeNetBalance = (totalIncome, totalExpense) => {
    const income = parseFloat(totalIncome) || 0;
    const expense = parseFloat(totalExpense) || 0;
    return parseFloat((income - expense).toFixed(2));
};

//Safe Decimal Conversion

/**
 * Safely converts a Prisma Decimal or any value to a JS float with 2dp.
 * @param {any} value
 * @returns {number}
 */
const toFloat = (value) => {
    if (value === null || value === undefined) return 0;
    return parseFloat(parseFloat(value).toFixed(2));
};

// Sum Array

/**
 * Sums an array of numeric values safely.
 * @param {number[]} values
 * @returns {number}
 */
const sumArray = (values) => {
    return parseFloat(
        values
            .reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
            .toFixed(2)
    );
};

// Savings Rate

/**
 * Calculates savings rate as a percentage of income.
 * @param {number} income
 * @param {number} expense
 * @returns {number} percentage (0-100)
 */
const computeSavingsRate = (income, expense) => {
    const i = parseFloat(income) || 0;
    const e = parseFloat(expense) || 0;
    if (i === 0) return 0;
    const rate = ((i - e) / i) * 100;
    return parseFloat(rate.toFixed(2));
};

module.exports = {
    computeNetBalance,
    toFloat,
    sumArray,
    computeSavingsRate,
};
