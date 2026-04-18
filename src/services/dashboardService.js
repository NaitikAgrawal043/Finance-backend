const mongoose = require("mongoose");
const Record = require("../models/Record");
const {
    computeNetBalance,
    toFloat,
    computeSavingsRate,
} = require("../utils/calculations");

// ─── Scope helper 

/**
 * Returns a userId filter if the requester is not admin.
 * Excludes soft-deleted records.
 * @param {{ userId, role }} requester
 */
const buildScope = (requester) => {
    const scope = { deletedAt: null };
    if (requester.role !== "admin") {
        scope.userId = new mongoose.Types.ObjectId(String(requester.userId));
    }
    return scope;
};

// ─── Summary 

/**
 * Returns total income, total expense, net balance, and savings rate.
 */
const getSummary = async (requester) => {
    const match = buildScope(requester);

    const agg = await Record.aggregate([
        { $match: match },
        {
            $group: {
                _id: "$type",
                amount: { $sum: "$amount" },
                count: { $sum: 1 },
            },
        },
    ]);

    let rawIncome = 0;
    let rawExpense = 0;
    let incomeTransactionCount = 0;
    let expenseTransactionCount = 0;

    agg.forEach((row) => {
        if (row._id === "income") {
            rawIncome = row.amount;
            incomeTransactionCount = row.count;
        } else if (row._id === "expense") {
            rawExpense = row.amount;
            expenseTransactionCount = row.count;
        }
    });

    const totalIncome = toFloat(rawIncome);
    const totalExpense = toFloat(rawExpense);
    const netBalance = computeNetBalance(totalIncome, totalExpense);
    const savingsRate = computeSavingsRate(totalIncome, totalExpense);

    return {
        totalIncome,
        totalExpense,
        netBalance,
        savingsRate,
        incomeTransactionCount,
        expenseTransactionCount,
    };
};

// ─── Category Totals 

/**
 * Returns per-category totals grouped by income/expense type.
 */
const getCategoryTotals = async (requester) => {
    const match = buildScope(requester);

    const grouped = await Record.aggregate([
        { $match: match },
        {
            $group: {
                _id: { category: "$category", type: "$type" },
                amount: { $sum: "$amount" },
                count: { $sum: 1 },
            },
        },
        { $sort: { amount: -1 } },
    ]);

    const categories = {};
    for (const row of grouped) {
        const category = row._id.category;
        const type = row._id.type;

        if (!categories[category]) {
            categories[category] = {
                category: category,
                income: 0,
                expense: 0,
                transactionCount: 0,
            };
        }
        const amount = toFloat(row.amount);
        categories[category][type] = amount;
        categories[category].transactionCount += row.count;
    }

    const result = Object.values(categories).map((c) => ({
        ...c,
        net: parseFloat((c.income - c.expense).toFixed(2)),
    }));

    result.sort((a, b) => b.income + b.expense - (a.income + a.expense));

    return result;
};

// ─── Recent Transactions 

const getRecentTransactions = async (requester, limit = 10) => {
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const match = buildScope(requester);

    const records = await Record.find(match)
        .sort({ date: -1 })
        .limit(limitNum)
        .populate("userId", "name email");

    // Format to match old prisma shape
    return records.map(r => {
        const obj = r.toJSON();
        if (obj.userId && typeof obj.userId === 'object') {
            obj.user = obj.userId;
            obj.userId = obj.user.id || obj.user._id;
        }
        return obj;
    });
};

// ─── Monthly Trends 

/**
 * Returns monthly income and expense totals for the last N months.
 */
const getMonthlyTrends = async (requester, months = 12) => {
    const monthsNum = Math.min(36, Math.max(1, parseInt(months) || 12));

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - monthsNum + 1);
    cutoff.setDate(1);
    cutoff.setHours(0, 0, 0, 0);

    const match = { ...buildScope(requester), date: { $gte: cutoff } };

    const results = await Record.aggregate([
        { $match: match },
        {
            $group: {
                _id: {
                    month: { $dateToString: { format: "%Y-%m", date: "$date" } },
                    type: "$type",
                },
                total: { $sum: "$amount" },
                count: { $sum: 1 },
            },
        },
        { $sort: { "_id.month": 1, "_id.type": 1 } },
    ]);

    const monthMap = {};
    for (const row of results) {
        const month = row._id.month;
        const type = row._id.type;

        if (!monthMap[month]) {
            monthMap[month] = {
                month: month,
                income: 0,
                expense: 0,
                transactionCount: 0,
            };
        }
        monthMap[month][type] = toFloat(row.total);
        monthMap[month].transactionCount += row.count;
    }

    return Object.values(monthMap).map((m) => ({
        ...m,
        net: parseFloat((m.income - m.expense).toFixed(2)),
    }));
};

module.exports = {
    getSummary,
    getCategoryTotals,
    getRecentTransactions,
    getMonthlyTrends,
};
