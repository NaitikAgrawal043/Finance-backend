
const VALID_ROLES = ["viewer", "analyst", "admin"];
const VALID_TYPES = ["income", "expense"];
const VALID_STATUSES = ["active", "inactive"];

//Email

/**
 * Validates an email address format using RFC 5322-inspired regex.
 * @param {string} email
 * @returns {{ valid: boolean, message?: string }}
 */
const validateEmail = (email) => {
    if (!email || typeof email !== "string")
        return { valid: false, message: "Email is required." };

    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!emailRegex.test(trimmed))
        return { valid: false, message: "Invalid email format." };

    if (trimmed.length > 254)
        return { valid: false, message: "Email must not exceed 254 characters." };

    return { valid: true };
};

// Password

/**
 * Validates password strength.
 * Must be at least 8 characters.
 * @param {string} password
 */
const validatePassword = (password) => {
    if (!password || typeof password !== "string")
        return { valid: false, message: "Password is required." };

    if (password.length < 8)
        return {
            valid: false,
            message: "Password must be at least 8 characters long.",
        };

    if (password.length > 128)
        return { valid: false, message: "Password must not exceed 128 characters." };

    return { valid: true };
};

// Name

/**
 * Validates a user's display name.
 * @param {string} name
 */
const validateName = (name) => {
    if (!name || typeof name !== "string" || !name.trim())
        return { valid: false, message: "Name is required." };

    if (name.trim().length < 2)
        return { valid: false, message: "Name must be at least 2 characters long." };

    if (name.trim().length > 100)
        return { valid: false, message: "Name must not exceed 100 characters." };

    return { valid: true };
};

// Amount

/**
 * Validates a monetary amount.
 * Must be a positive number with at most 2 decimal places.
 * @param {any} amount
 */
const validateAmount = (amount) => {
    if (amount === undefined || amount === null || amount === "")
        return { valid: false, message: "Amount is required." };

    const num = Number(amount);

    if (isNaN(num))
        return { valid: false, message: "Amount must be a valid number." };

    if (num <= 0)
        return { valid: false, message: "Amount must be greater than zero." };

    if (num > 9_999_999_999.99)
        return { valid: false, message: "Amount exceeds maximum allowed value." };

    // Allow at most 2 decimal places
    if (!/^\d+(\.\d{1,2})?$/.test(String(num)))
        return {
            valid: false,
            message: "Amount can have at most 2 decimal places.",
        };

    return { valid: true };
};

// Type

/**
 * Validates record type — must be "income" or "expense".
 * @param {string} type
 */
const validateType = (type) => {
    if (!type || typeof type !== "string")
        return { valid: false, message: "Type is required." };

    if (!VALID_TYPES.includes(type.toLowerCase()))
        return {
            valid: false,
            message: `Type must be one of: ${VALID_TYPES.join(", ")}.`,
        };

    return { valid: true };
};

// Category

/**
 * Validates a category string.
 * @param {string} category
 */
const validateCategory = (category) => {
    if (!category || typeof category !== "string" || !category.trim())
        return { valid: false, message: "Category is required." };

    if (category.trim().length > 100)
        return {
            valid: false,
            message: "Category must not exceed 100 characters.",
        };

    return { valid: true };
};

// Date

/**
 * Validates that date is a parseable date string.
 * @param {string} date
 */
const validateDate = (date) => {
    if (!date) return { valid: false, message: "Date is required." };

    const parsed = new Date(date);
    if (isNaN(parsed.getTime()))
        return { valid: false, message: "Date must be a valid ISO date string." };

    return { valid: true };
};

//Role

/**
 * Validates that role is one of the permitted values.
 * @param {string} role
 */
const validateRole = (role) => {
    if (!role || typeof role !== "string")
        return { valid: false, message: "Role is required." };

    if (!VALID_ROLES.includes(role.toLowerCase()))
        return {
            valid: false,
            message: `Role must be one of: ${VALID_ROLES.join(", ")}.`,
        };

    return { valid: true };
};

//Status

/**
 * Validates that status is "active" or "inactive".
 * @param {string} status
 */
const validateStatus = (status) => {
    if (!status || typeof status !== "string")
        return { valid: false, message: "Status is required." };

    if (!VALID_STATUSES.includes(status.toLowerCase()))
        return {
            valid: false,
            message: `Status must be one of: ${VALID_STATUSES.join(", ")}.`,
        };

    return { valid: true };
};

//Composite record validator

/**
 * Validates all fields required to create a financial record.
 * Returns the first encountered error message, or null if all valid.
 * @param {{ amount, type, category, date, notes }} fields
 * @returns {string|null} error message or null
 */
const validateRecordInput = ({ amount, type, category, date, notes }) => {
    const checks = [
        validateAmount(amount),
        validateType(type),
        validateCategory(category),
        validateDate(date),
    ];

    for (const check of checks) {
        if (!check.valid) return check.message;
    }

    if (notes !== undefined && notes !== null) {
        if (typeof notes !== "string")
            return "Notes must be a string.";
        if (notes.length > 500)
            return "Notes must not exceed 500 characters.";
    }

    return null;
};

module.exports = {
    validateEmail,
    validatePassword,
    validateName,
    validateAmount,
    validateType,
    validateCategory,
    validateDate,
    validateRole,
    validateStatus,
    validateRecordInput,
    VALID_ROLES,
    VALID_TYPES,
    VALID_STATUSES,
};
