const prisma = require("../config/db");
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
const buildScope = (requester) => ({
    deletedAt: null,
    ...(requester.role !== "admin" ? { userId: requester.userId } : {}),
});

// ─── Summary 

/**
 * Returns total income, total expense, net balance, and savings rate.
 * @param {{ userId, role }} requester
 */
const getSummary = async (requester) => {
    const where = buildScope(requester);

    const [incomeAgg, expenseAgg] = await Promise.all([
        prisma.record.aggregate({
            where: { ...where, type: "income" },
            _sum: { amount: true },
            _count: { id: true },
        }),
        prisma.record.aggregate({
            where: { ...where, type: "expense" },
            _sum: { amount: true },
            _count: { id: true },
        }),
    ]);

    const totalIncome = toFloat(incomeAgg._sum.amount);
    const totalExpense = toFloat(expenseAgg._sum.amount);
    const netBalance = computeNetBalance(totalIncome, totalExpense);
    const savingsRate = computeSavingsRate(totalIncome, totalExpense);

    return {
        totalIncome,
        totalExpense,
        netBalance,
        savingsRate,
        incomeTransactionCount: incomeAgg._count.id,
        expenseTransactionCount: expenseAgg._count.id,
    };
};

// ─── Category Totals 

/**
 * Returns per-category totals grouped by income/expense type.
 * @param {{ userId, role }} requester
 */
const getCategoryTotals = async (requester) => {
    const where = buildScope(requester);

    const grouped = await prisma.record.groupBy({
        by: ["category", "type"],
        where,
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: "desc" } },
    });

    // Reshape into a more readable format
    const categories = {};
    for (const row of grouped) {
        if (!categories[row.category]) {
            categories[row.category] = {
                category: row.category,
                income: 0,
                expense: 0,
                transactionCount: 0,
            };
        }
        const amount = toFloat(row._sum.amount);
        categories[row.category][row.type] = amount;
        categories[row.category].transactionCount += row._count.id;
    }

    // Add net for each category
    const result = Object.values(categories).map((c) => ({
        ...c,
        net: parseFloat((c.income - c.expense).toFixed(2)),
    }));

    // Sort by total activity (income + expense desc)
    result.sort((a, b) => b.income + b.expense - (a.income + a.expense));

    return result;
};

// ─── Recent Transactions 

/**
 * Returns the N most recent transactions.
 * @param {{ userId, role }} requester
 * @param {number} limit - default 10, max 50
 */
const getRecentTransactions = async (requester, limit = 10) => {
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const where = buildScope(requester);

    const records = await prisma.record.findMany({
        where,
        orderBy: { date: "desc" },
        take: limitNum,
        include: {
            user: { select: { id: true, name: true } },
        },
    });

    return records;
};

// ─── Monthly Trends 

/**
 * Returns monthly income and expense totals for the last N months.
 * Uses Prisma raw query for grouping by month and year.
 *
 * @param {{ userId, role }} requester
 * @param {number} months - how many past months to include (default 12)
 */
const getMonthlyTrends = async (requester, months = 12) => {
    const monthsNum = Math.min(36, Math.max(1, parseInt(months) || 12));

    // Calculate cutoff date
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - monthsNum + 1);
    cutoff.setDate(1);
    cutoff.setHours(0, 0, 0, 0);

    const userFilter = requester.role !== "admin" ? requester.userId : null;

    // Raw query for month-year grouping (Prisma groupBy doesn't support date_trunc)
    // Two separate queries to safely avoid SQL injection from dynamic userId
    let results;

    if (userFilter) {
        // Scoped to specific user — userId is parameterized safely
        results = await prisma.$queryRaw`
        SELECT
          TO_CHAR(date, 'YYYY-MM') AS month,
          type,
          SUM(amount)::float       AS total,
          COUNT(id)::int           AS count
        FROM records
        WHERE
          "deletedAt" IS NULL
          AND date >= ${cutoff}
          AND "userId" = ${userFilter}
        GROUP BY month, type
        ORDER BY month ASC, type ASC
      `;
    } else {
        // Admin — no userId restriction
        results = await prisma.$queryRaw`
        SELECT
          TO_CHAR(date, 'YYYY-MM') AS month,
          type,
          SUM(amount)::float       AS total,
          COUNT(id)::int           AS count
        FROM records
        WHERE
          "deletedAt" IS NULL
          AND date >= ${cutoff}
        GROUP BY month, type
        ORDER BY month ASC, type ASC
      `;
    }

    // Reshape into { month, income, expense, net, transactionCount }
    const monthMap = {};
    for (const row of results) {
        if (!monthMap[row.month]) {
            monthMap[row.month] = {
                month: row.month,
                income: 0,
                expense: 0,
                transactionCount: 0,
            };
        }
        monthMap[row.month][row.type] = toFloat(row.total);
        monthMap[row.month].transactionCount += row.count;
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
